import LoginUseCase, { LoginRequest, LoginResponse } from "../usecases/LoginUseCase";
import UserRepository from "../infra/repositories/UserRepository";

export default class AuthController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtSecret: string,
  ) {}

  async login(data: LoginRequest): Promise<LoginResponse> {
    const loginUseCase = new LoginUseCase(this.userRepository, this.jwtSecret);
    return loginUseCase.execute(data);
  }
}
