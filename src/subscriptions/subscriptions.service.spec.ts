import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from '@shared/schemas';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let subscriptionModel: any;

  const mockSubscription = {
    _id: 'sub123',
    userId: 'user123',
    planId: 'prod_test',
    priceId: 'price_test',
    stripePaymentIntentId: 'pi_test123',
    status: 'completed',
    amount: 5000,
    currency: 'usd',
    paidAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getModelToken(Subscription.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findOneAndUpdate: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    subscriptionModel = module.get(getModelToken(Subscription.name));
  });

  describe('create', () => {
    it('should create a new subscription', async () => {
      subscriptionModel.create.mockResolvedValue(mockSubscription);

      const result = await service.create({
        userId: 'user123',
        planId: 'prod_test',
        priceId: 'price_test',
        stripePaymentIntentId: 'pi_test123',
        status: 'completed',
        amount: 5000,
        currency: 'usd',
      } as any);

      expect(result).toEqual(mockSubscription);
      expect(subscriptionModel.create).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should return subscription for a user', async () => {
      const mockChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSubscription),
      };
      subscriptionModel.findOne.mockReturnValue(mockChain);

      const result = await service.findByUserId('user123');

      expect(result).toEqual(mockSubscription);
      expect(subscriptionModel.findOne).toHaveBeenCalledWith({
        userId: 'user123',
        status: 'completed',
      });
    });

    it('should return null if no subscription found', async () => {
      const mockChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      subscriptionModel.findOne.mockReturnValue(mockChain);

      const result = await service.findByUserId('user123');

      expect(result).toBeNull();
    });
  });

  describe('findByPaymentIntentId', () => {
    it('should find subscription by payment intent ID', async () => {
      const mockChain = {
        exec: jest.fn().mockResolvedValue(mockSubscription),
      };
      subscriptionModel.findOne.mockReturnValue(mockChain);

      const result = await service.findByPaymentIntentId('pi_test123');

      expect(result).toEqual(mockSubscription);
      expect(subscriptionModel.findOne).toHaveBeenCalledWith({
        stripePaymentIntentId: 'pi_test123',
      });
    });
  });

  describe('findAll', () => {
    it('should return all subscriptions', async () => {
      const mockChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockSubscription]),
      };
      subscriptionModel.find.mockReturnValue(mockChain);

      const result = await service.findAll();

      expect(result).toEqual([mockSubscription]);
      expect(subscriptionModel.find).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update subscription status', async () => {
      subscriptionModel.findOneAndUpdate.mockResolvedValue(mockSubscription);

      const result = await service.updateStatus('pi_test123', 'cancelled');

      expect(result).toEqual(mockSubscription);
      expect(subscriptionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { stripePaymentIntentId: 'pi_test123' },
        { status: 'cancelled' },
        { new: true },
      );
    });

    it('should throw NotFoundException if subscription not found', async () => {
      subscriptionModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateStatus('pi_invalid', 'cancelled'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateStatus('pi_invalid', 'cancelled'),
      ).rejects.toThrow('Payment record not found');
    });
  });

  describe('cancel', () => {
    it('should cancel subscription', async () => {
      const cancelledSubscription = {
        ...mockSubscription,
        status: 'cancelled',
        cancelledAt: new Date(),
      };
      subscriptionModel.findOneAndUpdate.mockResolvedValue(cancelledSubscription);

      const result = await service.cancel('pi_test123');

      expect(result.status).toBe('cancelled');
      expect(subscriptionModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('hasActivePayment', () => {
    it('should return true if user has active payment', async () => {
      subscriptionModel.countDocuments.mockResolvedValue(1);

      const result = await service.hasActivePayment('user123');

      expect(result).toBe(true);
      expect(subscriptionModel.countDocuments).toHaveBeenCalledWith({
        userId: 'user123',
        status: 'completed',
      });
    });

    it('should return false if user has no active payment', async () => {
      subscriptionModel.countDocuments.mockResolvedValue(0);

      const result = await service.hasActivePayment('user123');

      expect(result).toBe(false);
    });
  });
});
