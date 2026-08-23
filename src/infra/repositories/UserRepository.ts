import User from "../../entities/User";

export type AuthUser = {
  id: string;
  passwordHash: string;
};

export default interface UserRepository {
  getById(id: string): Promise<User>;
  getByUsername(username: string): Promise<User>;
  getByEmail(email: string): Promise<AuthUser | null>;
}
