import { supabase } from '@/lib/supabase/client';
import type { PaymentProvider, PaymentStatus } from '@/types/database';

export const paymentsApi = {
  // Create a payment record
  async createPayment(
    userId: string,
    amount: number,
    currency: string,
    courseId: string,
    provider: PaymentProvider,
    metadata?: any
  ) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount,
        currency,
        course_id: courseId,
        payment_provider: provider,
        status: 'pending',
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      throw error;
    }

    return data;
  },

  // Update payment status
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    providerPaymentId?: string
  ) {
    const { data, error } = await supabase
      .from('payments')
      .update({
        status,
        provider_payment_id: providerPaymentId,
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      throw error;
    }

    return data;
  },

  // Get user payments
  async getUserPayments(userId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        course:courses (
          id,
          title,
          thumbnail_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }

    return data || [];
  },

  // Get payment by ID
  async getPayment(paymentId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }

    return data;
  },
};
