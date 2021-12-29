
# OFX TS
Parse Open Financial Exchange (OFX) files into a usable data structure.

For details on the OFX file format, download the latest specification from
http://www.ofx.org/downloads.html

# History

This is based on [node-ofx](https://github.com/chilts/node-ofx), modified to
be a TypeScript implementation and to offer a promise-based API.

# Usage

Example usage:

```javascript
import { parseFile as parseOFX } from "ofx";

const { info, transactions } = await parseOFX("bank-statement.ofx");
// do something...
```
