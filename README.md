## MikaGPT

A Discord Bot using OpenAI and Gemini APIs

### Getting Started

#### Prerequisites

- Node.js
- npm or pnpm

#### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/norowachi/MikaGPT.git
   cd MikaGPT
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Create a `.env` file and fill in the required values according to `example.env`

4. Give access to bot using `/access trust` and remove using `/access untrust`
   note: you have to trust yourself first to use `/imagine` command

#### Building the Project

To build the project, run:

```sh
npm run build
```

### Usage

#### Registering Commands

To register the commands with Discord, run:

```sh
npm run register
```

#### Running the Project

To start the server, run:

```sh
npm start
```

This will start the server on the port specified in the `.env` file.
depending on your way of hosting and making the server externally accessible, using means like `Cloudflare Tunnels` or any other reverse proxy, you just have to put the public URL in the `Interactions Endpoint` section in your bot application: `<your url>/interactions`
