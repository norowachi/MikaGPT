## MikaGPT

A Discord Bot using OpenAI's API

### Getting Started

#### Prerequisites

- Node.js
- npm or pnpm

#### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/Noro95/MikaGPT.git
   cd MikaGPT
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Create a `.env` file and fill in the required values according to `example.env`

4. Modify `Owners` array and put your own user ID in `src/utils/constants.ts`

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
