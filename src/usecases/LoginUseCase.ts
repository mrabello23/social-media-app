import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import UserRepository from "../infra/repositories/UserRepository";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  userId: string;
};

export default class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtSecret: string,
  ) {}

  async execute(data: LoginRequest): Promise<LoginResponse> {
    const user = await this.userRepository.getByEmail(data.email);
    const validPassword = user ? await bcrypt.compare(data.password, user.passwordHash) : false;

    if (!user || !validPassword) {
      throw new Error("Invalid credentials.");
    }

    return {
      accessToken: jwt.sign({}, this.jwtSecret, {
        subject: user.id,
        expiresIn: "1h",
      }),
      userId: user.id,
    };
  }
}
