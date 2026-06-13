# Hey Zeeshan 👋

## What is V1-CLOSURE-CONTEXT.md?

This file is our **single source of truth** for the V1 closure project.

Think of it as a shared brain between you, Pablo, and Claude Code. Every time we work on
this project — on any computer, in any session — this file tells everyone exactly where
we are, what we've done, and what still needs doing.

---

## Why do we need it?

Pablo and you are working on **different computers**.
We're also working with **Claude Code** (AI assistant) to analyze and document the code.

The problem: Claude Code has no memory between sessions. Every time we start a new
conversation, it starts from zero. If we don't give it context, it won't know what
we've already done and we'll waste time repeating ourselves.

**The solution:** This file. It's always up to date. We paste it at the start of every
session and Claude Code immediately knows everything.

---

## The simple rule

```
START of session  →  paste V1-CLOSURE-CONTEXT.md into the conversation
END of session    →  update V1-CLOSURE-CONTEXT.md with what changed
```

That's it.

---

## What's inside the file?

- **Project overview** — what we're doing and why
- **Team** — who does what
- **V1 platform** — everything documented about martialapp.com so far
- **Open questions** — things we still need from you
- **Closure deliverables** — the three documents we're producing
- **Transition plan** — what needs to happen before V1 shuts down
- **Session log** — history of every work session

---

## What we need from you, Ze

The file has a section called **Open Questions** with a checklist. The main things:

1. **Laravel repo access** — GitHub link or zip. This is the big one.
2. **Mobile app** — is it a separate codebase or a WebView of the web panel?
3. **Superadmin panel** — walkthrough of what it can do
4. **Student panel** — what does a logged-in student see and do?
5. **Infrastructure** — servers, hosting, DNS, cron jobs
6. **Academy** — is it the same Laravel repo or a separate project?

You don't need to answer everything at once. Share what you have and we update the
context file as we go.

---

## How a typical session looks

1. Pablo or Ze opens a new conversation with Claude Code
2. Pastes `V1-CLOSURE-CONTEXT.md` at the start
3. Claude Code reads it and picks up exactly where we left off
4. We work — analyze code, write documentation, answer questions
5. At the end, we update the context file with what changed
6. Save it, push it, share it — ready for the next session on any computer

---

## In short

**V1-CLOSURE-CONTEXT.md = the project's memory.**
Whoever holds this file is fully up to speed. Never start a session without it.
