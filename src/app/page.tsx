export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      {/* Header */}
      <header className="px-6 py-4">
        <nav className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-xl font-bold text-zinc-900 dark:text-white">
            Erudify
          </span>
          <a
            href="/read"
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Start Studying
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="px-6">
        <section className="mx-auto max-w-5xl py-20 text-center">
          <div className="mb-6 text-6xl">&#x5B66;</div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
            Learn Chinese,
            <br />
            <span className="text-red-600">Remember Forever</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Master Chinese characters and vocabulary with spaced repetition.
            Study smarter, not harder, and build lasting fluency.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/read"
              className="rounded-full bg-red-600 px-8 py-3 text-lg font-medium text-white transition-colors hover:bg-red-700"
            >
              Start Learning Free
            </a>
            <a
              href="#how-it-works"
              className="rounded-full border border-zinc-300 px-8 py-3 text-lg font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              How It Works
            </a>
          </div>
        </section>

        {/* Features Section */}
        <section id="how-it-works" className="mx-auto max-w-5xl py-20">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            Why Spaced Repetition?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
              <div className="mb-4 text-3xl">&#x8111;</div>
              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
                Science-Backed
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Review characters right before you forget them. Our algorithm
                optimizes your study schedule for maximum retention.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
              <div className="mb-4 text-3xl">&#x23F1;</div>
              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
                Efficient Learning
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Spend just 15 minutes a day. Focus on what you need to review,
                not what you already know.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
              <div className="mb-4 text-3xl">&#x1F4C8;</div>
              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
                Track Progress
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Watch your vocabulary grow. See statistics on your learning
                streak and mastered characters.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section
          id="get-started"
          className="mx-auto max-w-5xl py-20 text-center"
        >
          <h2 className="mb-6 text-3xl font-bold text-zinc-900 dark:text-white">
            Ready to Start?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            Join thousands of learners mastering Chinese characters with
            Erudify.
          </p>
          <a
            href="/read"
            className="inline-block rounded-full bg-red-600 px-8 py-3 text-lg font-medium text-white transition-colors hover:bg-red-700"
          >
            Start Studying Now
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 px-6 py-8 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl text-center text-sm text-zinc-500 dark:text-zinc-500">
          &copy; {new Date().getFullYear()} Erudify. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
