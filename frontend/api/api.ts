import type { InboundPasteData, OutboundPasteData } from "../components/PasteInterface";
import type { User } from "../components/NavBar";

export enum RequestMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

type ErrorCodes = 400 | 401 | 403 | 404 | 409 | 500 | 502;
export type ApiResponse<T> = [ ErrorCodes, { message: string } ] | [ Exclude<number, ErrorCodes>, T ];

export type RequestOptions = {
  cookies?: Partial<{ [key: string]: string; }>,
  headers?: Record<string, string>,
  json?: any,
};

// TODO: change this to turbine domain
export const BASE_API_URL: string = 'https://pastebackend.bobobot.cf/api';

export async function request<Response>(
  method: RequestMethod,
  route: string,
  {
    cookies,
    headers,
    json,
  }: RequestOptions = {},
): Promise<ApiResponse<Response>> {
  if (json != null) {
    headers = {
      ...headers,
      "Content-Type": "application/json",
    };
  }

  if (cookies != null && cookies.token) {
    headers = {
      ...headers,
      "Authorization": cookies.token,
    }
  }

  let response;

  try {
    response = await fetch(BASE_API_URL + route, {
      method,
      headers,
      body: JSON.stringify(json),
    });
  } catch (exc) {
    if (!(exc instanceof DOMException)) {
      throw exc;
    }

    return [502, { message: `Networking error (${exc.name}): ${exc.message}` }];
  }

  if (response.headers.get("content-type") === "application/json") {
    const [ status, data ] = [ response.status, await response.json() ];

    if (status === 429) {
      const match = /Try again in ([\d.]+) seconds/.exec(data.message);

      if (match == null) {
        throw new Error(`Unexpected 429 response: ${data}`);
      }

      const seconds = parseFloat(match[1]);

      console.info(`Ratelimited on route ${route}: Delaying request for ${seconds} seconds...`);
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));

      return await request(method, route, { cookies, headers, json });
    }

    return [ status, data ];
  }

  else if (response.ok) {
    return [ response.status, await response.text() as unknown as Response ];
  }

  return [
    response.status,
    {
      message: "Unknown error - please view request information to diagnose this error.",
    }
  ] as unknown as ApiResponse<Response>;
}

export async function getPaste(id: string, options?: RequestOptions): Promise<ApiResponse<InboundPasteData>> {
  return request<InboundPasteData>(RequestMethod.GET, `/pastes/${id}`, options);
}

export async function createPaste(payload: OutboundPasteData, options?: RequestOptions): Promise<ApiResponse<{ id: string }>> {
  return request<{ id: string }>(RequestMethod.POST, "/pastes", {
    json: payload,
    ...options,
  });
}

export async function toggleStar(pasteId: string, options?: RequestOptions): Promise<ApiResponse<{ stars: number, deleted: boolean }>> {
  return request<{ stars: number, deleted: boolean }>(RequestMethod.PUT, `/pastes/${pasteId}/stars`, options);
}

export async function login(payload: { username?: string, email?: string, password: string }, options?: RequestOptions): Promise<ApiResponse<{ id: string, token: string }>> {
  return request<{ id: string, token: string }>(RequestMethod.POST, "/login", {
    json: payload,
    ...options,
  });
}

export async function getMe(options: RequestOptions): Promise<ApiResponse<User>> {
  return request<User>(RequestMethod.GET, "/users/me", options);
}

export async function getUser(id: string, options?: RequestOptions): Promise<ApiResponse<User>> {
  return request<User>(RequestMethod.GET, `/users/${id}`, options);
}

export async function loginGithub(access_code: string, options?: RequestOptions): Promise<ApiResponse<{ id: string, token: string }>> {
  return request<{ id: string, token: string }>(RequestMethod.POST, "/login/github", {
    json: { access_code },
    ...options,
  });
}
