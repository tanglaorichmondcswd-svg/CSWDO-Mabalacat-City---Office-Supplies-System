import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, UserRole } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const COLLECTION = 'users';

export const userService = {
  async createUser(userId: string, data: Pick<User, 'name' | 'email' | 'position' | 'role'>) {
    const docRef = doc(db, COLLECTION, userId);
    try {
      await setDoc(docRef, {
        uid: userId,
        ...data,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${COLLECTION}/${userId}`);
    }
  },

  async getUser(userId: string) {
    const docRef = doc(db, COLLECTION, userId);
    try {
      const snap = await getDoc(docRef);
      return snap.exists() ? (snap.data() as User) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${userId}`);
    }
  },

  async getAllUsers() {
    try {
      const q = query(collection(db, COLLECTION));
      const snap = await getDocs(q);
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid,
          name: data.name,
          email: data.email,
          position: data.position,
          role: data.role,
          createdAt: data.createdAt
        } as User;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION);
    }
  },

  async updateUser(userId: string, data: Partial<Pick<User, 'name' | 'email' | 'position' | 'role'>>) {
    const docRef = doc(db, COLLECTION, userId);
    try {
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${userId}`);
    }
  },

  async deleteUser(userId: string) {
    const docRef = doc(db, COLLECTION, userId);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${userId}`);
    }
  }
};
