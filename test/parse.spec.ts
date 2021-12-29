import { parseFile } from "../src";

describe('OFX Test', () => {
  beforeEach(async () => {
  });

  it('Parser', async () => {
    const { header, info, transactions } = await parseFile ("./test/data/example.ofx");

    // console.log(header);
    // console.log(info);
    // console.log(transactions[0]);
    // console.log(OFX.SIGNONMSGSRSV1.SONRS);
    // console.log(OFX.BANKMSGSRSV1.STMTTRNRS);

    // headers
    expect(header.OFXHEADER).toBe("100");
    expect(header.ENCODING).toBe("USASCII");

    return expect(transactions[0]).toStrictEqual({
      type       : 'DEP',
      date       : '2021-06-01',
      amt        : 385000,
      id         : '20210601038500000',
      checknum   : '91600046',
      description: 'DEPÓSITO ONLINE'
    });
  });
});
