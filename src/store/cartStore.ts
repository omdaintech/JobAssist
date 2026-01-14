import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Course } from '@/types/course';

interface CartItem {
  course: Course;
  addedAt: Date;
}

interface CartState {
  items: CartItem[];
  addItem: (course: Course) => void;
  removeItem: (courseId: string) => void;
  clearCart: () => void;
  isInCart: (courseId: string) => boolean;
  getTotalPrice: (currency: 'USD' | 'EGP' | 'SEK') => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (course) => {
        const { items } = get();
        if (!items.find(item => item.course.id === course.id)) {
          set({
            items: [...items, { course, addedAt: new Date() }]
          });
        }
      },

      removeItem: (courseId) => {
        set(state => ({
          items: state.items.filter(item => item.course.id !== courseId)
        }));
      },

      clearCart: () => set({ items: [] }),

      isInCart: (courseId) => {
        return get().items.some(item => item.course.id === courseId);
      },

      getTotalPrice: (currency) => {
        const { items } = get();
        return items.reduce((total, item) => {
          const price = currency === 'USD'
            ? item.course.price_usd
            : currency === 'EGP'
            ? item.course.price_egp
            : item.course.price_sek;
          return total + (price || 0);
        }, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
