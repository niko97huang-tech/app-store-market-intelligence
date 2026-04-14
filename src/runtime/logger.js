const LEVEL_ORDER = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
};

function normalizeLevel(level) {
  return LEVEL_ORDER[level] ? level : "info";
}

export function createLogger(scope, level = "info") {
  const currentLevel = normalizeLevel(level);

  function shouldLog(target) {
    return LEVEL_ORDER[target] >= LEVEL_ORDER[currentLevel];
  }

  function write(target, message, meta) {
    if (!shouldLog(target)) {
      return;
    }
    const prefix = `[${new Date().toISOString()}] [${scope}] [${target.toUpperCase()}]`;
    const parts = [prefix, message];
    if (meta !== undefined) {
      parts.push(typeof meta === "string" ? meta : JSON.stringify(meta));
    }
    process.stderr.write(`${parts.join(" ")}\n`);
  }

  return {
    debug(message, meta) {
      write("debug", message, meta);
    },
    info(message, meta) {
      write("info", message, meta);
    },
    warn(message, meta) {
      write("warn", message, meta);
    },
    error(message, meta) {
      write("error", message, meta);
    },
    result(payload) {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    },
  };
}

