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
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Budget, SubBudget } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const BUDGETS_COL = 'budgets';

export const budgetService = {
  // Mother Budgets
  async getBudgets() {
    try {
      const q = query(collection(db, BUDGETS_COL), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Budget));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, BUDGETS_COL);
    }
  },

  async createBudget(data: Omit<Budget, 'id' | 'createdAt'>) {
    try {
      const ref = collection(db, BUDGETS_COL);
      await addDoc(ref, {
        ...data,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, BUDGETS_COL);
    }
  },

  // Sub Budgets
  async getSubBudgets(budgetId: string) {
    try {
      const path = `${BUDGETS_COL}/${budgetId}/programs`;
      const q = query(collection(db, path), orderBy('targetDate', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SubBudget));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'sub_budgets');
    }
  },

  async createSubBudget(budgetId: string, data: Omit<SubBudget, 'id' | 'budgetId' | 'createdAt'>) {
    try {
      const path = `${BUDGETS_COL}/${budgetId}/programs`;
      const ref = collection(db, path);
      await addDoc(ref, {
        ...data,
        budgetId,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sub_budget');
    }
  },

  async updateBudget(id: string, data: Partial<Budget>) {
    try {
      const ref = doc(db, BUDGETS_COL, id);
      await updateDoc(ref, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, BUDGETS_COL);
    }
  },

  async deleteBudget(id: string) {
    try {
      const ref = doc(db, BUDGETS_COL, id);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, BUDGETS_COL);
    }
  },

  async updateSubBudget(budgetId: string, subId: string, data: Partial<SubBudget>) {
    try {
      const ref = doc(db, `${BUDGETS_COL}/${budgetId}/programs`, subId);
      await updateDoc(ref, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'sub_budget');
    }
  },

  async deleteSubBudget(budgetId: string, subId: string) {
    try {
      const ref = doc(db, `${BUDGETS_COL}/${budgetId}/programs`, subId);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'sub_budget');
    }
  }
};
