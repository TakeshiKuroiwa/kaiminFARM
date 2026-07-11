type RedisCommand = (string | number)[];

type RedisRestResponse<T> = {
  result?: T;
  error?: string;
};

type StoredValue = string;

type MemoryRedisStore = {
  values: Map<string, StoredValue>;
  expirations: Map<string, number>;
};

const globalMemoryStore = globalThis as typeof globalThis & {
  __kaiminMemoryRedis?: MemoryRedisStore;
};

const memoryStore =
  globalMemoryStore.__kaiminMemoryRedis ??
  (globalMemoryStore.__kaiminMemoryRedis = {
    values: new Map<string, StoredValue>(),
    expirations: new Map<string, number>()
  });

const memory = memoryStore.values;
const expirations = memoryStore.expirations;

function getRedisConfig() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

function clearExpired(key: string) {
  const expiresAt = expirations.get(key);
  if (expiresAt && expiresAt <= Date.now()) {
    memory.delete(key);
    expirations.delete(key);
  }
}

async function command<T>(cmd: RedisCommand): Promise<T | null> {
  const config = getRedisConfig();
  if (!config) {
    return memoryCommand<T>(cmd);
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(cmd),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Redis REST command failed: ${response.status}`);
  }

  const payload = (await response.json()) as RedisRestResponse<T>;
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result ?? null;
}

function memoryCommand<T>(cmd: RedisCommand): T | null {
  const [name, ...args] = cmd;
  const op = String(name).toUpperCase();

  if (op === "GET") {
    const key = String(args[0]);
    clearExpired(key);
    return (memory.get(key) ?? null) as T | null;
  }

  if (op === "SET") {
    const key = String(args[0]);
    const value = String(args[1]);
    const options = args.map(String);
    const nx = options.includes("NX");
    const exIndex = options.indexOf("EX");

    clearExpired(key);
    if (nx && memory.has(key)) {
      return null;
    }

    memory.set(key, value);
    if (exIndex >= 0 && options[exIndex + 1]) {
      expirations.set(key, Date.now() + Number(options[exIndex + 1]) * 1000);
    }
    return "OK" as T;
  }

  if (op === "DEL") {
    let deleted = 0;
    for (const arg of args) {
      const key = String(arg);
      clearExpired(key);
      if (memory.delete(key)) {
        deleted += 1;
      }
      expirations.delete(key);
    }
    return deleted as T;
  }

  if (op === "EXPIRE") {
    const key = String(args[0]);
    clearExpired(key);
    if (!memory.has(key)) {
      return 0 as T;
    }
    expirations.set(key, Date.now() + Number(args[1]) * 1000);
    return 1 as T;
  }

  throw new Error(`Unsupported memory Redis command: ${op}`);
}

export async function getJson<T>(key: string): Promise<T | null> {
  const value = await command<string>(["GET", key]);
  if (!value) {
    return null;
  }
  return JSON.parse(value) as T;
}

export async function setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const payload = JSON.stringify(value);
  if (ttlSeconds) {
    await command(["SET", key, payload, "EX", ttlSeconds]);
    return;
  }
  await command(["SET", key, payload]);
}

export async function setJsonNx(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  const result = await command<string>(["SET", key, JSON.stringify(value), "NX", "EX", ttlSeconds]);
  return result === "OK";
}

export async function getString(key: string): Promise<string | null> {
  return command<string>(["GET", key]);
}

export async function setString(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (ttlSeconds) {
    await command(["SET", key, value, "EX", ttlSeconds]);
    return;
  }
  await command(["SET", key, value]);
}

export async function setStringNx(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  const cmd: RedisCommand = ttlSeconds
    ? ["SET", key, value, "NX", "EX", ttlSeconds]
    : ["SET", key, value, "NX"];
  const result = await command<string>(cmd);
  return result === "OK";
}

export async function deleteKeys(...keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  await command(["DEL", ...keys]);
}

export async function expireKey(key: string, ttlSeconds: number): Promise<void> {
  await command(["EXPIRE", key, ttlSeconds]);
}
