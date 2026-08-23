import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import UserRepository from "../src/infra/repositories/UserRepository";

const mockDoPost = jest.fn();
const mockDoRepost = jest.fn();
const mockDoQuotePost = jest.fn();
const mockGetHomepage = jest.fn();
const mockGetUserProfile = jest.fn();
const mockGetUserData = jest.fn();
const mockUserRepository = {
  getByEmail: jest.fn(),
} as unknown as UserRepository;

function createPostControllerMock() {
  return jest.fn().mockImplementation(() => ({
    doPost: mockDoPost,
    doRepost: mockDoRepost,
    doQuotePost: mockDoQuotePost,
    getHomepage: mockGetHomepage,
  }));
}

jest.mock("../src/controllers/PostController", createPostControllerMock);

function createUserControllerMock() {
  return jest.fn().mockImplementation(() => ({
    getUserProfile: mockGetUserProfile,
    getUserData: mockGetUserData,
  }));
}

jest.mock("../src/controllers/UserController", createUserControllerMock);

// Jest mocks must be registered before the app imports its controllers.
// eslint-disable-next-line import/first
import { createApp } from "../src/app";

const testSecret = "test-secret";
const app = createApp(testSecret, mockUserRepository);
const authorization = `Bearer ${jwt.sign({}, testSecret, { subject: "user-id" })}`;

afterEach(() => {
  jest.clearAllMocks();
  mockDoPost.mockResolvedValue(undefined);
  mockDoRepost.mockResolvedValue(undefined);
  mockDoQuotePost.mockResolvedValue(undefined);
  mockGetHomepage.mockResolvedValue({
    posts: [],
    quotes: [],
    previousPage: 1,
    nextPage: 2,
  });
  mockGetUserProfile.mockResolvedValue({
    profile: {},
    feed: { posts: [], previousPage: 1, nextPage: 2 },
    totalPosts: 0,
  });
  mockGetUserData.mockResolvedValue({});
});

describe("HTTP routes", () => {
  it("returns a successful health check without starting a listener", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("Ok");
  });

  it("rejects login requests with missing credentials", async () => {
    const response = await request(app).post("/v1/auth/login").send({ email: "user@email.com" });

    expect(response.status).toBe(400);
  });

  it("issues a JWT for valid login credentials", async () => {
    mockUserRepository.getByEmail = jest.fn().mockResolvedValue({
      id: "user-id",
      passwordHash: await bcrypt.hash("correct-password", 4),
    });

    const response = await request(app).post("/v1/auth/login").send({
      email: "user@email.com",
      password: "correct-password",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.userId).toBe("user-id");
    expect(jwt.verify(response.body.data.accessToken, testSecret)).toMatchObject({
      sub: "user-id",
    });
  });

  it("returns the same unauthorized response for unknown login credentials", async () => {
    mockUserRepository.getByEmail = jest.fn().mockResolvedValue(null);

    const response = await request(app).post("/v1/auth/login").send({
      email: "unknown@email.com",
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid credentials.");
  });

  it("delegates a valid post request with the standardized userId field", async () => {
    const response = await request(app).post("/v1/post").set("Authorization", authorization).send({
      userId: "user-id",
      text: "A valid post",
    });

    expect(response.status).toBe(200);
    expect(mockDoPost).toHaveBeenCalledWith({ userId: "user-id", text: "A valid post" });
  });

  it("uses the authenticated identity when post userId is omitted", async () => {
    const response = await request(app)
      .post("/v1/post")
      .set("Authorization", authorization)
      .send({ text: "A post" });

    expect(response.status).toBe(200);
    expect(mockDoPost).toHaveBeenCalledWith({ userId: "user-id", text: "A post" });
  });

  it("rejects a post with empty text", async () => {
    const response = await request(app).post("/v1/post").set("Authorization", authorization).send({
      userId: "user-id",
      text: "",
    });

    expect(response.status).toBe(400);
    expect(mockDoPost).not.toHaveBeenCalled();
  });

  it.each([
    ["whitespace-only text", "   "],
    ["non-string text", 123],
    ["text above the limit", "a".repeat(778)],
  ])("rejects %s", async (_label, text) => {
    const response = await request(app).post("/v1/post").set("Authorization", authorization).send({
      text,
    });

    expect(response.status).toBe(400);
    expect(mockDoPost).not.toHaveBeenCalled();
  });

  it("rejects a repost without an original post", async () => {
    const response = await request(app)
      .post("/v1/repost")
      .set("Authorization", authorization)
      .send({
        userId: "user-id",
        text: "A repost",
      });

    expect(response.status).toBe(400);
    expect(mockDoRepost).not.toHaveBeenCalled();
  });

  it("rejects a repost with an invalid original post ID", async () => {
    const response = await request(app).post("/v1/repost").set("Authorization", authorization).send({
      text: "A repost",
      originalPostId: "not-a-uuid",
    });

    expect(response.status).toBe(400);
    expect(mockDoRepost).not.toHaveBeenCalled();
  });

  it("delegates a valid repost", async () => {
    const response = await request(app)
      .post("/v1/repost")
      .set("Authorization", authorization)
      .send({
        userId: "user-id",
        text: "A repost",
        originalPostId: "11111111-1111-4111-8111-111111111111",
      });

    expect(response.status).toBe(200);
    expect(mockDoRepost).toHaveBeenCalledWith({
      userId: "user-id",
      text: "A repost",
      postId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("rejects a quote post without an original post", async () => {
    const response = await request(app)
      .post("/v1/quote-post")
      .set("Authorization", authorization)
      .send({
        userId: "user-id",
        text: "A quote",
      });

    expect(response.status).toBe(400);
    expect(mockDoQuotePost).not.toHaveBeenCalled();
  });

  it("delegates a valid quote post", async () => {
    const response = await request(app)
      .post("/v1/quote-post")
      .set("Authorization", authorization)
      .send({
        userId: "user-id",
        text: "A quote",
        originalPostId: "11111111-1111-4111-8111-111111111111",
      });

    expect(response.status).toBe(200);
    expect(mockDoQuotePost).toHaveBeenCalledWith({
      userId: "user-id",
      text: "A quote",
      postId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("delegates a valid feed request", async () => {
    const response = await request(app)
      .post("/v1/post/feed")
      .set("Authorization", authorization)
      .send({
        userId: "user-id",
        from: "2023-01-01 00:00:00",
        to: "2023-01-31 23:59:59",
      });

    expect(response.status).toBe(200);
    expect(mockGetHomepage).toHaveBeenCalledWith({
      userId: "user-id",
      from: "2023-01-01 00:00:00",
      to: "2023-01-31 23:59:59",
    });
  });

  it("rejects a feed filter for another authenticated user before cache lookup", async () => {
    const response = await request(app)
      .post("/v1/post/feed")
      .set("Authorization", authorization)
      .send({ userId: "another-user-id" });

    expect(response.status).toBe(403);
    expect(mockGetHomepage).not.toHaveBeenCalledWith({ userId: "another-user-id" });
  });

  it("rejects a feed filter with the wrong type", async () => {
    const response = await request(app)
      .post("/v1/post/feed")
      .set("Authorization", authorization)
      .send({ from: 123 });

    expect(response.status).toBe(400);
    expect(mockGetHomepage).not.toHaveBeenCalled();
  });

  it("delegates valid user profile and username requests", async () => {
    const profileResponse = await request(app)
      .post("/v1/user/profile")
      .set("Authorization", authorization)
      .send({
        userId: "user-id",
      });
    const userResponse = await request(app)
      .get("/v1/user/usr1abc")
      .set("Authorization", authorization);

    expect(profileResponse.status).toBe(200);
    expect(userResponse.status).toBe(200);
    expect(mockGetUserProfile).toHaveBeenCalledWith("user-id");
    expect(mockGetUserData).toHaveBeenCalledWith("usr1abc");
  });

  it("uses the authenticated identity when profile userId is omitted", async () => {
    const response = await request(app)
      .post("/v1/user/profile")
      .set("Authorization", authorization)
      .send({});

    expect(response.status).toBe(200);
  });

  it("rejects protected requests without authentication", async () => {
    const response = await request(app).post("/v1/post").send({ text: "A post" });

    expect(response.status).toBe(401);
    expect(mockDoPost).not.toHaveBeenCalled();
  });

  it("rejects an invalid authentication token", async () => {
    const response = await request(app)
      .post("/v1/post")
      .set("Authorization", "Bearer invalid-token")
      .send({ text: "A post" });

    expect(response.status).toBe(401);
    expect(mockDoPost).not.toHaveBeenCalled();
  });

  it("rejects a body userId that does not match the authenticated identity", async () => {
    const response = await request(app).post("/v1/post").set("Authorization", authorization).send({
      userId: "another-user-id",
      text: "A post",
    });

    expect(response.status).toBe(403);
    expect(mockDoPost).not.toHaveBeenCalled();
  });
});
