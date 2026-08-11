import type { AvailabilityLock } from '@/types/commerce';
import { prisma } from '@/lib/prisma';

export interface CreateAvailabilityLockInput {
  checkInDate: string;
  checkOutDate: string;
  inventorySource: AvailabilityLock['inventorySource'];
  quantity: number;
  roomTypeId: string;
  ttlMilliseconds: number;
}

export interface AvailabilityLockRepository {
  convert(id: string): Promise<AvailabilityLock | undefined>;
  create(input: CreateAvailabilityLockInput): Promise<AvailabilityLock>;
  findById(id: string): Promise<AvailabilityLock | undefined>;
  findReservedByRoomType(
    roomTypeId: string,
    checkInDate: string,
    checkOutDate: string,
  ): Promise<AvailabilityLock[]>;
  release(id: string): Promise<void>;
}

export class InMemoryAvailabilityLockRepository implements AvailabilityLockRepository {
  private readonly locks = new Map<string, AvailabilityLock>();

  async convert(id: string): Promise<AvailabilityLock | undefined> {
    const lock = await this.findById(id);
    if (!lock || lock.status !== 'active') {
      return undefined;
    }

    const convertedLock: AvailabilityLock = { ...lock, status: 'converted' };
    this.locks.set(id, convertedLock);
    return convertedLock;
  }

  async create(input: CreateAvailabilityLockInput): Promise<AvailabilityLock> {
    const lock: AvailabilityLock = {
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      expiresAt: new Date(Date.now() + input.ttlMilliseconds).toISOString(),
      id: crypto.randomUUID(),
      inventorySource: input.inventorySource,
      quantity: input.quantity,
      roomTypeId: input.roomTypeId,
      status: 'active',
    };

    this.locks.set(lock.id, lock);
    return lock;
  }

  async findReservedByRoomType(
    roomTypeId: string,
    checkInDate: string,
    checkOutDate: string,
  ): Promise<AvailabilityLock[]> {
    const now = Date.now();

    return [...this.locks.values()].filter((lock) => {
      if (
        !['active', 'converted'].includes(lock.status) ||
        lock.roomTypeId !== roomTypeId ||
        lock.checkInDate >= checkOutDate ||
        lock.checkOutDate <= checkInDate
      ) {
        return false;
      }

      if (new Date(lock.expiresAt).getTime() <= now) {
        this.locks.set(lock.id, { ...lock, status: 'expired' });
        return false;
      }

      return true;
    });
  }

  async findById(id: string): Promise<AvailabilityLock | undefined> {
    const lock = this.locks.get(id);
    if (!lock) {
      return undefined;
    }

    if (lock.status === 'active' && new Date(lock.expiresAt).getTime() <= Date.now()) {
      const expiredLock: AvailabilityLock = { ...lock, status: 'expired' };
      this.locks.set(id, expiredLock);
      return expiredLock;
    }

    return lock;
  }

  async release(id: string): Promise<void> {
    const lock = this.locks.get(id);
    if (!lock || lock.status !== 'converted') return;

    this.locks.set(id, {
      ...lock,
      status: new Date(lock.expiresAt).getTime() <= Date.now() ? 'expired' : 'active',
    });
  }
}

function mapLock(lock: {
  checkInDate: string;
  checkOutDate: string;
  expiresAt: Date;
  id: string;
  inventorySource: string;
  quantity: number;
  roomTypeId: string;
  status: string;
}): AvailabilityLock {
  return {
    checkInDate: lock.checkInDate,
    checkOutDate: lock.checkOutDate,
    expiresAt: lock.expiresAt.toISOString(),
    id: lock.id,
    inventorySource: lock.inventorySource as AvailabilityLock['inventorySource'],
    quantity: lock.quantity,
    roomTypeId: lock.roomTypeId,
    status: lock.status as AvailabilityLock['status'],
  };
}

export class PrismaAvailabilityLockRepository implements AvailabilityLockRepository {
  async convert(id: string): Promise<AvailabilityLock | undefined> {
    const result = await prisma.availabilityLock.updateMany({
      data: { status: 'converted' },
      where: { expiresAt: { gt: new Date() }, id, status: 'active' },
    });

    return result.count === 1 ? this.findById(id) : undefined;
  }

  async create(input: CreateAvailabilityLockInput): Promise<AvailabilityLock> {
    const lock = await prisma.availabilityLock.create({
      data: {
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        expiresAt: new Date(Date.now() + input.ttlMilliseconds),
        id: crypto.randomUUID(),
        inventorySource: input.inventorySource,
        quantity: input.quantity,
        roomTypeId: input.roomTypeId,
        status: 'active',
      },
    });

    return mapLock(lock);
  }

  async findReservedByRoomType(
    roomTypeId: string,
    checkInDate: string,
    checkOutDate: string,
  ): Promise<AvailabilityLock[]> {
    const now = new Date();
    await prisma.availabilityLock.updateMany({
      data: { status: 'expired' },
      where: { expiresAt: { lte: now }, roomTypeId, status: 'active' },
    });

    const locks = await prisma.availabilityLock.findMany({
      where: {
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
        OR: [{ expiresAt: { gt: now }, status: 'active' }, { status: 'converted' }],
        roomTypeId,
      },
    });
    return locks.map(mapLock);
  }

  async findById(id: string): Promise<AvailabilityLock | undefined> {
    const lock = await prisma.availabilityLock.findUnique({ where: { id } });
    if (!lock) {
      return undefined;
    }

    if (lock.status === 'active' && lock.expiresAt.getTime() <= Date.now()) {
      const expired = await prisma.availabilityLock.update({
        data: { status: 'expired' },
        where: { id },
      });
      return mapLock(expired);
    }

    return mapLock(lock);
  }

  async release(id: string): Promise<void> {
    const now = new Date();
    await prisma.$transaction([
      prisma.availabilityLock.updateMany({
        data: { status: 'active' },
        where: { expiresAt: { gt: now }, id, status: 'converted' },
      }),
      prisma.availabilityLock.updateMany({
        data: { status: 'expired' },
        where: { expiresAt: { lte: now }, id, status: 'converted' },
      }),
    ]);
  }
}

export const availabilityLockRepository = new PrismaAvailabilityLockRepository();
