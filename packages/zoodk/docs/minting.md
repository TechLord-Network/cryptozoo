# Minting Cryptomedia

Cryptomedia is the foundational primitive of the Zoo Protocol.

Cryptomedia is a medium for anyone on the internet to create universally accessible and individually ownable hypermedia.

To create new cryptomedia using the ZDK, you must call the `mint` function.

The `mint` function on a `Zoo` instance expects two parameters: `MediaData` and `BidShares`

### MediaData

The `MediaData` type is composed of four fields:

```typescript
type MediaData = {
  tokenURI: string
  metadataURI: string
  contentHash: BytesLike
  metadataHash: BytesLike
}
```

#### tokenURI

The uri where the cryptomedia's content is hosted. This could link to any storage provider on the internet. Some examples of _decentralized_ storage providers are:

- [ipfs](https://ipfs.io/)
- [arweave](https://www.arweave.org/)
- [storj](https://storj.io/)
- [sia](https://sia.tech/)

The token uri must be prefixed with `https://` or at mint time the sdk will reject it.

#### metadataURI

The uri where the cryptomedia's metadata is hosted. This could link to any storage provider on the internet. Some examples of _decentralized_ storage providers are:

- [ipfs](https://ipfs.io/)
- [arweave](https://www.arweave.org/)
- [storj](https://storj.io/)
- [sia](https://sia.tech/)

The metadata uri must be prefixed with `https://` or at mint time the sdk will reject it.

To construct the metadata of a piece of cryptomedia, use the `generateMetadata` function defined in `metadata.ts`. For more info visit [Metadata](../docs/metadata.md)

#### contentHash

The sha256 hash of the content the cryptomedia represents. It is imperative that this hash is correct, because once it is written to the blockchain it **cannot** be changed.
To generate this hash use any of the sha256 utils defined in [utils](../docs/utils.md).

#### metadataHash

The sha256 hash of the metadata of the cryptomedia. It is imperative that this hash is correct, because once it is written to the blockchain it **cannot** be changed.
To generate this hash use any of the sha256 utils defined in [utils](../docs/utils.md).

#### Example

```typescript
import { constructMediaData, sha256FromBuffer, generateMetadata } from '@zoolabs/zdk'

const metadataJSON = generateMetadata('zoo-20210101', {
  description: '',
  mimeType: 'text/plain',
  name: '',
  version: 'zoo-20210101',
})

const contentHash = sha256FromBuffer(Buffer.from('Ours Truly,'))
const metadataHash = sha256FromBuffer(Buffer.from(metadataJSON))
const mediaData = constructMediaData(
  'https://ipfs.io/ipfs/bafybeifyqibqlheu7ij7fwdex4y2pw2wo7eaw2z6lec5zhbxu3cvxul6h4',
  'https://ipfs.io/ipfs/bafybeifpxcq2hhbzuy2ich3duh7cjk4zk4czjl6ufbpmxep247ugwzsny4',
  contentHash,
  metadataHash
)
```

### BidShares

The `BidShares` type is composed of three fields:

```typescript
type DecimalValue = { value: BigNumber }

type BidShares = {
  owner: DecimalValue
  prevOwner: DecimalValue
  creator: DecimalValue
}
```

Each field represents the share that each stakeholder of a piece of cryptomedia has on the **next** accepted bid. At the time of mint, the indivduals bid shares (creator, owner, prevOwner) **must** sum to 100.

#### creator

The immutable, perpetual equity (%) the creator gets from each accepted bid of the piece of cryptomedia.

#### owner

The equity (%) the current owner gets from the next accepted bid of the piece of cryptomedia.

#### prevOwner

The equity (%) the previous owner gets from the next accepted bid of the piece of cryptomedia.

###### Example

The Zoo Media Contract allows for 18 decimals of precision. To simplify precision, we created the `constructBidShares` method with accepts JS `numbers` and converts them to `ethers` `BigDecimal` types rounded to the **fourth** decimal.

```typescript
import { constructBidShares } from '@zoolabs/zdk'

const bidShares = constructBidShares(
  10, // creator share
  90, // owner share
  0 // prevOwner share
)
```

### All Together Now!

```typescript
import { Zoo } from '@zoolabs/zdk'
import { Wallet } from 'ethers'
import {
  constructBidShares,
  constructMediaData,
  sha256FromBuffer,
  generateMetadata,
} from '@zoolabs/zdk'

const wallet = Wallet.createRandom()
const zoo = new Zoo(wallet, 4)

const metadataJSON = generateMetadata('zoo-20210101', {
  description: '',
  mimeType: 'text/plain',
  name: '',
  version: 'zoo-20210101',
})

const contentHash = sha256FromBuffer(Buffer.from('Ours Truly,'))
const metadataHash = sha256FromBuffer(Buffer.from(metadataJSON))
const mediaData = constructMediaData(
  'https://ipfs.io/ipfs/bafybeifyqibqlheu7ij7fwdex4y2pw2wo7eaw2z6lec5zhbxu3cvxul6h4',
  'https://ipfs.io/ipfs/bafybeifpxcq2hhbzuy2ich3duh7cjk4zk4czjl6ufbpmxep247ugwzsny4',
  contentHash,
  metadataHash
)

/**
 * Note: Before minting, verify that the content stored at the uris
 * can be hashed and matches the hashes in the `MediaData`.
 *
 * Soon, we will ship utility functions to handle this for you.
 */

const bidShares = constructBidShares(
  10, // creator share
  90, // owner share
  0 // prevOwner share
)
const tx = await zoo.mint(mediaData, bidShares)
await tx.wait(8) // 8 confirmations to finalize
```
