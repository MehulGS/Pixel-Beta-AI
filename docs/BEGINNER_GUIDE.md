# Beginner Guide — Understanding Pixel Beta AI

This guide explains the project from the absolute beginning. It assumes you have never written code before. Everything is explained in plain English.

---

## What is a "frontend" and "backend"?

Imagine a restaurant.

- The **frontend** is everything the customer sees: the menu, the tables, the waiter. In our app, the frontend is the webpage you see in your browser — built with React.
- The **backend** is the kitchen — hidden from the customer, doing the actual work. In our app, the backend is a Python program that runs the AI models.

The waiter (frontend) takes your order and brings it to the kitchen (backend). The kitchen prepares the food (runs the AI) and sends it back to the waiter, who delivers it to you.

---

## What is an API?

**API** stands for Application Programming Interface.

It is a set of rules that say "if you send me a request like X, I will reply with Y."

Our backend has endpoints like `POST /analyze`. That means:
- If you send a file to that address, the backend will return an image description.
- The frontend sends the file, the backend processes it, and sends back the result.

---

## What is an "endpoint"?

An endpoint is a specific URL that your program can send a request to.

Examples from our app:
- `http://127.0.0.1:8000/analyze` — send an image, get a description
- `http://127.0.0.1:8000/transcribe-audio` — send audio, get a transcript

`127.0.0.1` means "this same computer" (called "localhost"). Port `8000` is the specific "door" the backend is listening at.

---

## What is a "request" and "response"?

When your browser wants data from the server, it sends a **request**. The server processes it and sends back a **response**.

Like a text message conversation:
- Request: "Hey, here is my audio file, please transcribe it."
- Response: "Sure, here is the transcript: 'Hello, how are you?'"

Requests and responses carry data in a format called **JSON**.

---

## What is JSON?

JSON (JavaScript Object Notation) is a way to represent data as text.

Example:
```json
{
  "filename": "recording.mp3",
  "transcript": "Hello, how are you?",
  "language": "en"
}
```

It looks like a dictionary with keys (words in quotes before `:`) and values (words/numbers after `:`). Our backend returns JSON, and the frontend reads it.

---

## What is React?

React is a JavaScript library for building user interfaces. Instead of writing HTML files that never change, React lets you write **components** — small reusable pieces of UI that can update automatically when data changes.

Think of components like LEGO bricks. `MessageBubble` is one brick. `Sidebar` is another. You snap them together in `App.tsx` to build the full page.

---

## What is a React component?

A component is a function that returns some HTML-like code (called JSX).

Simple example:
```tsx
function Greeting() {
  return <p>Hello from Pixel Beta AI!</p>;
}
```

When React renders this component, the user sees the paragraph on screen.

Our `MessageBubble.tsx` is a component that renders one chat message bubble.

---

## What is "state"?

State is data that a component remembers and can change.

Example: when you type in the message box, the text you typed is stored as state. When you press Send, the state is cleared.

In React, we create state with `useState`:
```tsx
const [text, setText] = useState(""); // text starts empty
```

`text` is the current value. `setText` is the function to change it. When `setText` is called, React automatically re-renders the component to show the new value.

---

## What is `useRef`?

Sometimes you need to access a DOM element directly (like focusing a text box).

`useRef` gives you a direct reference to a DOM element:
```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null);
// Later:
textareaRef.current?.focus(); // puts the cursor in the textarea
```

We use this in `MessageComposer` to auto-focus the input after sending.

---

## How does file upload work?

1. User clicks the `+` button or drags a file into the composer.
2. The browser creates a `File` object — this contains the file's data in memory.
3. We wrap it in `FormData`:
   ```ts
   const form = new FormData();
   form.append("file", theFile);
   ```
4. We send it with `fetch()`:
   ```ts
   const res = await fetch("http://127.0.0.1:8000/analyze", {
     method: "POST",
     body: form,
   });
   ```
5. The backend receives the file, processes it, returns JSON.
6. We parse the JSON: `const data = await res.json();`
7. We display the result in a message bubble.

---

## What is `async`/`await`?

When you send a network request, it takes time. Instead of freezing the whole browser, JavaScript uses `async` and `await` to say "start this task and come back when it's done."

```ts
async function fetchData() {
  const result = await fetch("http://..."); // wait for response
  const data = await result.json();         // wait for JSON parsing
  console.log(data);
}
```

`async` before a function means "this function can use await inside."
`await` before an expression means "wait for this to finish before continuing."

---

## How does localStorage work?

`localStorage` is a tiny database built into every browser. It stores key-value pairs as text:

```ts
localStorage.setItem("pba_theme", "dark");          // save
const theme = localStorage.getItem("pba_theme");    // read → "dark"
localStorage.removeItem("pba_theme");               // delete
```

We use `JSON.stringify()` to turn objects (like conversations) into text for storage, and `JSON.parse()` to turn them back:

```ts
const conv = { id: "123", title: "My chat", messages: [] };
localStorage.setItem("pba_conversations", JSON.stringify([conv]));
// Later:
const stored = JSON.parse(localStorage.getItem("pba_conversations") ?? "[]");
```

---

## How do themes work?

1. CSS custom properties (variables) define all colors:
   ```css
   [data-theme="dark"] {
     --bg-base: #080b10;
     --text-primary: #e2e8f0;
   }
   [data-theme="light"] {
     --bg-base: #f8fafc;
     --text-primary: #0f172a;
   }
   ```

2. Every style uses variables instead of hardcoded colors:
   ```css
   .sidebar { background: var(--bg-sidebar); }
   ```

3. The `useTheme` hook changes the `data-theme` attribute on `<html>`:
   ```ts
   document.documentElement.setAttribute("data-theme", "dark");
   ```

4. When the attribute changes, the browser immediately switches all colors. No page reload needed.

---

## How does modality detection work?

When you pick a file, the app needs to know what kind it is so it knows which API to call.

It checks two things:
1. **MIME type** — the browser's description of the file, like `image/jpeg` or `application/pdf`
2. **File extension** — the last part of the filename, like `.mp3` or `.pdf`

Some browsers report incorrect MIME types, so we check both:

```ts
function detectModality(file: File): Modality | null {
  const type = file.type.toLowerCase();
  const ext = getExt(file.name); // e.g. ".pdf"
  
  if (type === "image/jpeg" || ext === ".jpg") return "image";
  if (type === "application/pdf" || ext === ".pdf") return "document";
  if (type === "audio/mpeg" || ext === ".mp3") return "audio";
  return null; // unsupported
}
```

---

## How does conversation persistence work?

Every conversation is an object like this:
```ts
{
  id: "conv_1698765432000_abc",
  title: "Summarize my PDF",
  createdAt: 1698765432000,
  updatedAt: 1698765432000,
  pinned: false,
  messages: [
    { id: "msg_...", role: "user", content: "...", timestamp: ... },
    { id: "msg_...", role: "assistant", content: "...", timestamp: ... }
  ]
}
```

All conversations are stored as an array in localStorage. Every time a new message is added, the whole array is serialised and saved.

On page load, `useConversations` reads localStorage and restores the state — so the conversation history is exactly as you left it.

---

## How does FastAPI work?

FastAPI is a Python web framework. You write routes like this:

```python
@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    # process the file
    return {"description": "A cat sitting on a chair"}
```

The `@app.post("/analyze")` decorator says "when someone sends a POST request to /analyze, run this function."

`UploadFile` is a FastAPI type that automatically handles reading an uploaded file.

The `return` statement sends back JSON automatically.

---

## What happens step by step when you send a message?

1. You type "What is this image?" and attach `photo.jpg`
2. You press Enter
3. `MessageComposer` calls `onSend("What is this image?", attachment)`
4. `ChatView.handleSend()` runs:
   - Creates a user message and saves it to localStorage
   - Creates an "isLoading" AI placeholder and saves it
   - Calls `askAboutImage(file, "What is this image?")`
5. `api.ts` sends `FormData` to `http://127.0.0.1:8000/ask`
6. FastAPI receives the file and question
7. SmolVLM model processes the image + question
8. FastAPI returns `{ "answer": "The person is wearing a red jacket." }`
9. `ChatView` receives the answer
10. The loading placeholder is updated with the real answer and saved to localStorage
11. React re-renders — you see the answer appear in the chat
