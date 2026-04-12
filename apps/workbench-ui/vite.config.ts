import path from "path"
import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { IncomingMessage, ServerResponse } from "http"
import { spawn } from "child_process"
import { scanDota2Project } from "../../adapters/dota2/scanner/project-scan"
import { checkHostStatus } from "../../adapters/dota2/scanner/host-status"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../..")

/**
 * 读取请求体
 */
async function readRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on("error", reject)
  })
}

/**
 * Local API Bridge Plugin
 * 提供 workbench-ui 与 scanner/CLI 的桥接端点
 */
function localApiBridgePlugin() {
  return {
    name: "local-api-bridge",
    configureServer(server: any) {
      // POST /api/host/scan - 扫描 Dota2 项目
      server.middlewares.use("/api/host/scan", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const { hostRoot } = body

          if (!hostRoot) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing hostRoot" }))
            return
          }

          const result = scanDota2Project(hostRoot)

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ success: true, result }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }))
        }
      })

      // POST /api/host/status - 检查宿主状态
      server.middlewares.use("/api/host/status", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const { hostRoot } = body

          if (!hostRoot) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing hostRoot" }))
            return
          }

          const result = checkHostStatus(hostRoot)

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ success: true, result }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }))
        }
      })

      // POST /api/cli/execute - 执行 CLI 命令（流式返回）
      server.middlewares.use("/api/cli/execute", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const { command, hostRoot, prompt, write = false, force = false, addonName } = body

          if (!command) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing command" }))
            return
          }

          if (!hostRoot) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing hostRoot" }))
            return
          }

          if (command === "run" && !prompt) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing prompt for run command" }))
            return
          }

          // 设置流式响应头
          res.setHeader("Content-Type", "application/x-ndjson")
          res.setHeader("Transfer-Encoding", "chunked")
          res.setHeader("Cache-Control", "no-cache")

          // 构建 CLI 参数
          let cliArgs: string[]
          if (command === "init") {
            cliArgs = ["run", "cli", "--", "dota2", "init", "--host", `"${hostRoot}"`]
            const finalAddonName = addonName || path.basename(hostRoot).toLowerCase().replace(/[^a-z0-9_]/g, "_")
            cliArgs.push("--addon-name", finalAddonName)
          } else if (command === "run") {
            cliArgs = [
              "run", "cli", "--", "dota2", "run",
              `"${prompt}"`,
              "--host", `"${hostRoot}"`
            ]
            if (write) {
              cliArgs.push("--write")
            }
            if (force) {
              cliArgs.push("--force")
            }
            if (!write && !force) {
              cliArgs.push("--dry-run")
            }
          } else {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: `Unknown command: ${command}` }))
            return
          }

          const outputLines: string[] = []

          // Spawn CLI 进程
          const child = spawn("npm", cliArgs, {
            cwd: repoRoot,
            shell: true,
            env: { ...process.env, FORCE_COLOR: "0" },
            stdio: ["pipe", "pipe", "pipe"]
          })

          // 流式返回 stdout
          child.stdout.on("data", (data: Buffer) => {
            const lines = data.toString().split("\n").filter(Boolean)
            for (const line of lines) {
              outputLines.push(line)
              res.write(JSON.stringify({ type: "output", content: line }) + "\n")
            }
          })

          // 流式返回 stderr
          child.stderr.on("data", (data: Buffer) => {
            const lines = data.toString().split("\n").filter(Boolean)
            for (const line of lines) {
              outputLines.push(line)
              res.write(JSON.stringify({ type: "output", content: line }) + "\n")
            }
          })

          // 进程结束返回 result
          child.on("close", (code: number | null) => {
            res.write(JSON.stringify({
              type: "result",
              result: {
                success: code === 0,
                command,
                exitCode: code ?? 1,
                output: outputLines
              }
            }) + "\n")
            res.end()
          })

          // 错误处理
          child.on("error", (error: Error) => {
            res.write(JSON.stringify({
              type: "error",
              error: error.message
            }) + "\n")
            res.end()
          })
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), localApiBridgePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
