module.exports = {
  buildDir: "out",
  contractsDir: "src",
  testDir: "test",
  skipContracts: ["ERC20GodMode.sol", "ERC20Sanctions.sol", "TokenSale.sol"], // Relative paths from contractsDir
  skipTests: [""], // Relative paths from testDir
  testingTimeOutInSec: 300,
  network: "anvil",
  testingFramework: "forge",
  minimal: false,
  tce: false,
};
