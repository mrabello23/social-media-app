import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import LoginUseCase from "../src/usecases/LoginUseCase";
import UserRepository from "../src/infra/repositories/UserRepository";

const userRepository = {
  getById: jest.fn(),
  getByUsername: jest.fn(),
  getByEmail: jest.fn(),
} as unknown as jest.Mocked<UserRepository>;

const jwtSecret = "test-secret";

afterEach(() => {
  jest.clearAllMocks();
});

describe("LoginUseCase", () => {
  it("returns a token containing the authenticated user id", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    userRepository.getByEmail.mockResolvedValue({ id: "user-id", passwordHash });

    const result = await new LoginUseCase(userRepository, jwtSecret).execute({
      email: "user@email.com",
      password: "correct-password",
    });
    const payload = jwt.verify(result.accessToken, jwtSecret);

    expect(result.userId).toBe("user-id");
    expect(payload).toMatchObject({ sub: "user-id" });
  });

  it("rejects an unknown email without exposing which credential failed", async () => {
    userRepository.getByEmail.mockResolvedValue(null);

    await expect(
      new LoginUseCase(userRepository, jwtSecret).execute({
        email: "unknown@email.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid credentials.");
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    userRepository.getByEmail.mockResolvedValue({ id: "user-id", passwordHash });

    await expect(
      new LoginUseCase(userRepository, jwtSecret).execute({
        email: "user@email.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid credentials.");
  });
});
