import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      // Malformed hash, e.g. the blank one left on a deleted account.
      return false;
    }
  }

  /**
   * Spends the same time as a real check. Called when no account matches the
   * email so that response time does not reveal which addresses are registered.
   */
  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash('not-a-real-password');
    await this.verify(await this.dummyHash, password);
  }
}
