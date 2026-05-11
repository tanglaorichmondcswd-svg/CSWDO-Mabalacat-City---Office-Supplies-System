import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  query, 
  getDocs, 
  serverTimestamp,
  orderBy,
  where,
  runTransaction,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Item, Delivery, Request, InventoryMovement } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const ITEMS_COL = 'items';
const DELIVERIES_COL = 'deliveries';
const REQUESTS_COL = 'requests';
const MOVEMENTS_COL = 'inventory_movements';

export const inventoryService = {
  // Items
  async getItems() {
    try {
      const q = query(collection(db, ITEMS_COL), orderBy('itemId', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Item));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, ITEMS_COL);
    }
  },

  async createItem(data: Omit<Item, 'id' | 'createdAt'>) {
    try {
      const { deleteDoc, getDocs, query, collection, where } = await import('firebase/firestore');
      
      const movementsQ = query(collection(db, MOVEMENTS_COL), where('itemId', '==', data.itemId));
      const deliveriesQ = query(collection(db, DELIVERIES_COL), where('itemId', '==', data.itemId));
      const requestsQ = query(collection(db, REQUESTS_COL), where('itemId', '==', data.itemId));

      const [movementsSnap, deliveriesSnap, requestsSnap] = await Promise.all([
        getDocs(movementsQ),
        getDocs(deliveriesQ),
        getDocs(requestsQ)
      ]);

      const deletePromises: Promise<void>[] = [];
      movementsSnap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
      deliveriesSnap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
      requestsSnap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
      
      await Promise.all(deletePromises);

      const docRef = doc(db, ITEMS_COL, data.itemId);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, ITEMS_COL);
    }
  },

  // Deliveries
  async addDelivery(data: Omit<Delivery, 'id' | 'createdAt'>) {
    try {
      await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, ITEMS_COL, data.itemId);
        const itemSnap = await transaction.get(itemRef);

        if (!itemSnap.exists()) {
          // If item doesn't exist, create it with initial qty
          transaction.set(itemRef, {
            itemId: data.itemId,
            category: data.category,
            description: data.description,
            uom: data.uom,
            qty: data.qty,
            createdAt: serverTimestamp()
          });
        } else {
          // Update existing item qty
          const currentQty = itemSnap.data().qty || 0;
          transaction.update(itemRef, { qty: currentQty + data.qty });
        }

        // Add delivery record
        const deliveryRef = doc(collection(db, DELIVERIES_COL));
        transaction.set(deliveryRef, {
          ...data,
          createdAt: serverTimestamp()
        });

        // Add movement log
        const movementRef = doc(collection(db, MOVEMENTS_COL));
        transaction.set(movementRef, {
          itemId: data.itemId,
          type: 'IN',
          qty: data.qty,
          referenceId: deliveryRef.id,
          date: serverTimestamp()
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'delivery_transaction');
    }
  },

  async getDeliveries() {
    try {
      const q = query(collection(db, DELIVERIES_COL), orderBy('dateDelivered', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Delivery));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, DELIVERIES_COL);
    }
  },

  // Requests
  async createRequest(data: Omit<Request, 'id' | 'createdAt' | 'status'>) {
    try {
      const requestRef = collection(db, REQUESTS_COL);
      await addDoc(requestRef, {
        ...data,
        userId: auth.currentUser?.uid,
        status: 'Pending',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, REQUESTS_COL);
    }
  },

  async getRequests() {
    try {
      const q = query(collection(db, REQUESTS_COL), orderBy('dateRequested', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Request));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, REQUESTS_COL);
    }
  },

  async releaseRequest(requestId: string, itemId: string, qty: number, receivedBy: string) {
    try {
      await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, ITEMS_COL, itemId);
        const requestRef = doc(db, REQUESTS_COL, requestId);
        
        console.log(`Transaction context - Item: ${itemId}, Request: ${requestId}, Qty: ${qty}, ReceivedBy: ${receivedBy}`);
        
        const itemSnap = await transaction.get(itemRef);
        if (!itemSnap.exists()) {
          console.error(`Item doc ${itemId} not found in collection ${ITEMS_COL}`);
          throw new Error(`Item ${itemId} not found in database`);
        }
        
        const currentQty = itemSnap.data().qty || 0;
        if (currentQty < qty) {
          console.error(`Insufficient stock: have ${currentQty}, need ${qty}`);
          throw new Error(`Insufficient stock for ${itemId} (Available: ${currentQty}, Requested: ${qty})`);
        }

        console.log(`Updating item ${itemId}: ${currentQty} -> ${currentQty - qty}`);
        transaction.update(itemRef, { qty: currentQty - qty });
        
        console.log(`Updating request ${requestId} status to Released`);
        transaction.update(requestRef, { 
          status: 'Released',
          releasedAt: serverTimestamp(),
          receivedBy
        });

        const movementRef = doc(collection(db, MOVEMENTS_COL));
        transaction.set(movementRef, {
          itemId,
          type: 'OUT',
          qty,
          referenceId: requestId,
          date: serverTimestamp()
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'release_transaction');
    }
  },

  // Edit / Delete Actions
  async updateItem(id: string, data: Partial<Item>) {
    try {
      const docRef = doc(db, ITEMS_COL, id);
      await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, ITEMS_COL);
    }
  },

  async deleteItem(id: string) {
    try {
      const { deleteDoc, getDocs, query, where, collection } = await import('firebase/firestore');
      
      const movementsQ = query(collection(db, MOVEMENTS_COL), where('itemId', '==', id));
      const deliveriesQ = query(collection(db, DELIVERIES_COL), where('itemId', '==', id));
      const requestsQ = query(collection(db, REQUESTS_COL), where('itemId', '==', id));

      const [movementsSnap, deliveriesSnap, requestsSnap] = await Promise.all([
        getDocs(movementsQ),
        getDocs(deliveriesQ),
        getDocs(requestsQ)
      ]);

      const deletePromises: Promise<void>[] = [];
      movementsSnap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
      deliveriesSnap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
      requestsSnap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
      
      const docRef = doc(db, ITEMS_COL, id);
      deletePromises.push(deleteDoc(docRef));

      await Promise.all(deletePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, ITEMS_COL);
    }
  },

  async deleteDelivery(deliveryId: string, itemId: string, qty: number) {
    try {
      await runTransaction(db, async (transaction) => {
        const deliveryRef = doc(db, DELIVERIES_COL, deliveryId);
        const itemRef = doc(db, ITEMS_COL, itemId);
        const itemSnap = await transaction.get(itemRef);
        
        if (itemSnap.exists()) {
          const currentQty = itemSnap.data().qty || 0;
          transaction.update(itemRef, { qty: Math.max(0, currentQty - qty) });
          
          // Add a negative IN movement to subtract from 'New Delivery' column
          const movementRef = doc(collection(db, MOVEMENTS_COL));
          transaction.set(movementRef, {
            itemId,
            type: 'IN', // Keep as IN type to subtract from that column
            qty: -qty, // Negative quantity
            referenceId: `VOID-DEL-${deliveryId}`,
            date: serverTimestamp(),
            description: 'Correction: Delivery record deleted'
          });
        }
        
        transaction.delete(deliveryRef);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, DELIVERIES_COL);
    }
  },

  async deleteRequest(requestId: string) {
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, REQUESTS_COL, requestId);
        const requestSnap = await transaction.get(requestRef);
        
        if (!requestSnap.exists()) return;
        
        const requestData = requestSnap.data() as Request;
        
        // If it was already released, we must RETURN the stocks to inventory
        if (requestData.status === 'Released') {
          const itemRef = doc(db, ITEMS_COL, requestData.itemId);
          const itemSnap = await transaction.get(itemRef);
          
          if (itemSnap.exists()) {
            const currentQty = itemSnap.data().qty || 0;
            const returnQty = Number(requestData.qty) || 0;
            
            transaction.update(itemRef, { 
              qty: currentQty + returnQty 
            });
            
            // Log a negative OUT movement to subtract from 'OUT Movements' column
            const movementRef = doc(collection(db, MOVEMENTS_COL));
            transaction.set(movementRef, {
              itemId: requestData.itemId,
              type: 'OUT', // Keep as OUT type to subtract from that column
              qty: -returnQty, // Negative quantity
              referenceId: `VOID-REQ-${requestId}`,
              date: serverTimestamp(),
              description: 'Correction: Released request deleted (Stock Returned)'
            });
          }
        }
        
        transaction.delete(requestRef);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, REQUESTS_COL);
    }
  },

  async updateRequest(requestId: string, data: Partial<Request>) {
    try {
      const docRef = doc(db, REQUESTS_COL, requestId);
      await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, REQUESTS_COL);
    }
  },

  // Inventory Monitoring
  async getMovements() {
    try {
      const q = query(collection(db, MOVEMENTS_COL), orderBy('date', 'desc'), limit(1000));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryMovement));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, MOVEMENTS_COL);
    }
  }
};
