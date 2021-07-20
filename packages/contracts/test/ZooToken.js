const { ethers } = require('hardhat')
const { use, expect } = require('chai')
const { solidity } = require('ethereum-waffle')

use(solidity)

describe('ZooToken', function () {
  let token

  it('should deploy ZooToken contract', async function () {
    const [signer] = await ethers.getSigners()
    const ZooToken = await ethers.getContractFactory('ZooToken')
    token = await ZooToken.deploy()
  })

  it('should have correct name and symbol and decimal', async () => {
    const [signer] = await ethers.getSigners()
    const ZooToken = await ethers.getContractFactory('ZooToken')
    token = await ZooToken.deploy()
    const name = await token.name()
    const symbol = await token.symbol()
    const decimals = await token.decimals()
    expect(name.valueOf()).to.eq('ZooToken')
    expect(symbol.valueOf()).to.eq('ZOO')
    expect(decimals.valueOf()).to.eq(18)
  })
})
