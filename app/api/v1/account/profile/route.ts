import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getCurrentUser } from '@/lib/auth/session';
import { isValidName } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to update your profile.' }, { status: 401 });
    }

    const body = await readJsonObject(request);
    if (!body) {
      return NextResponse.json({ error: 'Enter valid profile details.' }, { status: 400 });
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    if (!isValidName(firstName) || !isValidName(lastName)) {
      return NextResponse.json(
        { error: 'First and last names are required and must be 80 characters or less.' },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      data: { firstName, lastName },
      select: { email: true, firstName: true, lastName: true },
      where: { id: user.id },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Account profile update failed.', error);
    return NextResponse.json(
      { error: 'The profile could not be updated. Please try again.' },
      { status: 503 },
    );
  }
}
