"use client"

import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, Loader2, Download, Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { marked } from "marked"

export default function Home() {
  const [jsonContent, setJsonContent] = useState<any>(null)
  const [htmlResponse, setHtmlResponse] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<"cli" | "html" | null>(null)

  const copy = (text: string, key: "cli" | "html") => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      "application/json": [".json"],
    },
    maxFiles: 1,
    noClick: true,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]
      setIsLoading(true)
      setError(null)

      try {
        const content = await readFileAsText(file)
        const parsedJson = JSON.parse(content)
        setJsonContent(parsedJson)

        await analyzeJson(parsedJson)
      } catch (err: any) {
        setError(err.message || "Failed to process JSON file")
        setJsonContent(null)
        setHtmlResponse("")
      } finally {
        setIsLoading(false)
      }
    },
  })

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }

  const analyzeJson = async (json: any): Promise<void> => {
    setError(null)
    setHtmlResponse("")

    const dependencies = json.dependencies || {}
    const devDependencies = json.devDependencies || {}
    const allDeps = { ...dependencies, ...devDependencies }

    if (Object.keys(allDeps).length === 0) {
      setError("No dependencies found in package.json.")
      return
    }

    const res = await fetch("https://api.byteshrink.dev/api/optimize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Model": "deepseek/deepseek-r1:free",
      },
      body: JSON.stringify({ dependencies, devDependencies }),
    })

    if (!res.ok || !res.body) {
      throw new Error("API call failed.")
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let aggregatedContent = ""
    let streamComplete = false
    let bufferedLine = ""

    const processLine = async (line: string) => {
      if (!line.startsWith("data: ")) return false
      const data = line.slice(6).trim()
      if (!data) return false
      if (data === "[DONE]") return true

      try {
        const parsed = JSON.parse(data)
        if (parsed.content) {
          aggregatedContent += parsed.content
          const html = await marked.parse(aggregatedContent)
          setHtmlResponse(html)
        }
      } catch (parseError) {
        console.error("Failed to parse streaming chunk", parseError)
      }
      return false
    }

    while (!streamComplete) {
      const { value, done } = await reader.read()
      if (value) {
        bufferedLine += decoder.decode(value, { stream: true })
      }

      const lines = bufferedLine.split("\n\n")
      bufferedLine = lines.pop() || ""

      for (const line of lines) {
        const shouldStop = await processLine(line)
        if (shouldStop) {
          streamComplete = true
          break
        }
      }

      if (done || streamComplete) {
        if (!streamComplete && bufferedLine) {
          streamComplete = await processLine(bufferedLine)
          bufferedLine = ""
        }
        break
      }
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Top bar */}
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-900 font-mono text-sm font-semibold text-white">
              bs
            </span>
            <span className="text-[15px] font-semibold tracking-tight">ByteShrink</span>
          </div>
          <a
            href="https://github.com/denodell/byteshrink-api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
          >
            <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 pb-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Trim your dependencies
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-gray-600">
            Drop in a <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-800">package.json</code> to
            find the packages weighing down your bundle, the ones that are out of date, and
            lighter alternatives worth switching to.
          </p>
        </section>

        {/* Upload */}
        <div
          {...getRootProps()}
          className={`rounded-xl border border-dashed px-6 py-14 text-center transition-colors ${
            isDragActive
              ? "border-gray-900 bg-gray-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-6 w-6 text-gray-400" strokeWidth={1.75} />
          <p className="mt-4 text-[15px] font-medium text-gray-900">
            {isDragActive ? "Drop it to analyze" : "Drag and drop your package.json"}
          </p>
          <p className="mt-1 text-sm text-gray-500">or</p>
          <Button
            variant="outline"
            className="mt-3 border-gray-300 font-normal text-gray-700 hover:bg-gray-50"
            onClick={open}
            type="button"
          >
            Choose a file
          </Button>
        </div>

        {/* CLI hint */}
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Prefer the terminal? Run it against your project directly.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <code className="font-mono text-[13px] text-gray-800">
              npx @byteshrink/cli ./package.json
            </code>
            <button
              onClick={() => copy("npx @byteshrink/cli ./package.json", "cli")}
              className="text-gray-400 transition-colors hover:text-gray-900"
              aria-label="Copy command"
              type="button"
            >
              {copied === "cli" ? (
                <Check className="h-4 w-4 text-gray-900" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="mt-10">
          {isLoading && (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-5 py-6 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="text-[15px]">Reading your dependencies…</span>
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-5">
              <h3 className="text-[15px] font-medium text-red-800">Couldn&apos;t analyze that file</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-red-300 font-normal text-red-700 hover:bg-red-100"
                onClick={() => setError(null)}
                type="button"
              >
                Try again
              </Button>
            </div>
          )}

          {htmlResponse && !error && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Results</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 font-normal text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    const blob = new Blob([htmlResponse], { type: "text/html" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "byteshrink-analysis.html"
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>

              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="h-9 border border-gray-200 bg-gray-100 p-1">
                  <TabsTrigger value="preview" className="text-sm data-[state=active]:bg-white">
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="source" className="text-sm data-[state=active]:bg-white">
                    HTML
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div className="rounded-xl border border-gray-200 p-6 sm:p-8">
                    <div
                      dangerouslySetInnerHTML={{ __html: htmlResponse }}
                      className="prose prose-neutral max-w-none prose-headings:font-semibold prose-a:text-gray-900"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="source" className="mt-4">
                  <div className="overflow-auto rounded-xl border border-gray-200 bg-gray-950 p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-xs text-gray-400">byteshrink-analysis.html</span>
                      <button
                        onClick={() => copy(htmlResponse, "html")}
                        className="flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-white"
                        type="button"
                      >
                        {copied === "html" ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-gray-200">
                      {htmlResponse}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {!htmlResponse && !isLoading && !error && (
            <p className="text-center text-sm text-gray-400">
              Your analysis will appear here.
            </p>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-20 border-t border-gray-200 pt-8">
          <p className="text-sm leading-relaxed text-gray-500">
            Only the <code className="font-mono text-[0.85em] text-gray-700">dependencies</code> and{" "}
            <code className="font-mono text-[0.85em] text-gray-700">devDependencies</code> fields are
            read from your file. Nothing is uploaded or stored — analysis runs against the request and
            is discarded.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
            <a
              href="https://github.com/denodell/byteshrink-api"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gray-900"
            >
              Open source on GitHub
            </a>
            <span className="text-gray-300">·</span>
            <span>
              Built by{" "}
              <a
                href="https://denodell.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 underline-offset-4 transition-colors hover:text-gray-900 hover:underline"
              >
                Den Odell
              </a>
            </span>
          </div>
        </footer>
      </main>
    </div>
  )
}
