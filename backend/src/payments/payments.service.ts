import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Order } from '../entities/order.entity';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

   constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set in environment');

    this.stripe = new Stripe(stripeKey, {
        apiVersion: '2025-09-30.clover',
    });
  }

  async createPaymentIntent(orderId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Create payment intent with Stripe
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(order.amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: order.id,
      },
    });

    //save payment record in the database
    const payment = this.paymentRepository.create({
    orderId: order.id,
    stripePaymentIntentId: paymentIntent.id,
    amount: order.amount,
    status: PaymentStatus.PENDING,
    });

    await this.paymentRepository.save(payment);
    return {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
        amount: order.amount,
    };
    }

    //Confirm Payment
    async confirmPayment(paymentIntentId: string) {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        const payment = await this.paymentRepository.findOne({
            where: { stripePaymentIntentId: paymentIntentId },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (paymentIntent.status === 'succeeded') {
            payment.status = PaymentStatus.SUCCEEDED;
        } else if (paymentIntent.status === 'canceled') {
            payment.status = PaymentStatus.FAILED;
        }

        await this.paymentRepository.save(payment);
        return payment;
    }

    async getPaymentStatus(orderId: string) {
    const payment = await this.paymentRepository.findOne({
        where: { orderId },
        order: { createdAt: 'DESC' },
    });
    if (!payment) {
        throw new NotFoundException('Payment not found');
    }
    return payment;
    }

    //Sending a webhook to the backend from Stripe
    async handleWebhook(signature: string, rawBody: Buffer) {
        const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
        if(!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not set in environment');
        }
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (err) {
            throw new Error(`Webhook signature verification failed: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                await this.confirmPayment(paymentIntent.id);
                console.log(`Payment succeeded: ${paymentIntent.id}`);
            break;
            
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object as Stripe.PaymentIntent;
                const payment = await this.paymentRepository.findOne({
                where: { stripePaymentIntentId: failedPayment.id },
                });
                if (payment) {
                payment.status = PaymentStatus.FAILED;
                await this.paymentRepository.save(payment);
                }
                console.log(`Payment failed: ${failedPayment.id}`);
            break;

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return { received: true }
    }
}