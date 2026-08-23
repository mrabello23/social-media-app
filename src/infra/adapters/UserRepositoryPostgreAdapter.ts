import Database from "../Database";
import User from "../../entities/User";
import UserRepository, { AuthUser } from "../repositories/UserRepository";

export default class UserRepositoryPostgreAdapter implements UserRepository {
  constructor(readonly db: Database) {}

  async getById(id: string): Promise<User> {
    let data = await this.db.query("SELECT * FROM public.user WHERE id = $1", [id]);

    if (data.length > 0) [data] = data;
    return new User(data);
  }

  async getByUsername(username: string): Promise<User> {
    let data = await this.db.query("SELECT * FROM public.user WHERE username = $1", [username]);

    if (data.length > 0) [data] = data;
    return new User(data);
  }

  async getByEmail(email: string): Promise<AuthUser | null> {
    const data = await this.db.query(
      'SELECT id, userpass AS "passwordHash" FROM public.user WHERE email = $1',
      [email],
    );

    return data.length > 0 ? data[0] : null;
  }
}
