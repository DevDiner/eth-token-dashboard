## Foundry

## 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

- This downloads and installs the Foundry toolkit (`forge`, `cast`, etc.).
- Running `foundryup` updates it to the latest version.

## 2. Initialize a New Project

```bash
cd  module-1/src
forge init --no-commit
```

- Creates a basic scaffolding (including `foundry.toml`, `src/`, `test/`).
- `--no-commit` avoids auto-committing to git.

## 3. Example `foundry.toml` with Remappings

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
remappings = [
  "@openzeppelin/=lib/openzeppelin-contracts/",
  "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"
]

```

1. **`src = "src"`**: Source files go in the `src/` folder.  
2. **`libs = ["lib"]`**: External libraries (like OpenZeppelin) are stored in `lib/`.  
3. **`remappings`**: Tells Foundry how to map imports like `@openzeppelin/contracts/` to the actual folder inside `lib/`.

## 4. Build & Test

Once your contracts are in `src/`, run:

```bash
forge build
```

- **`forge build`** compiles your contracts.  



-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
