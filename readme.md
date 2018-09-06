# TOKEN EXCHANGE

## Running
```
yarn compile
ganache-cli
```

## Case 1
Simple 1 to 1 offer
```
$ ./run.js
Deploying tokenFactory...
  tokenFactory deployed at: 0x4bC1C650e34EFBd5049b4E9D9E600D057495543b
Creating tokens...
  TKA deployed at: 0x87B61f2272b2F78cfBc65626E545A6efd4a18c4f
  TKB deployed at: 0xE6DFbC05B90661Bc45718435bC30D330bece5A6b
  TKC deployed at: 0x83DEE48eF4a4ae6EED17f6362B3c05F3E0c7d594
Init Balance...
  Reading all balances...
    account                                     TKA   TKB   TKC
    ------------------------------------------  ----  ----  ----
    0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976  5000  0     0
    0x6c024522f9867D0e627fAC2786Ae791dc282ef70  0     5000  0
    0x90f7d0873FE5AA1a2132BF427385b462DC652fca  0     0     5000
    0x5595988DeabcD21c3EbF7939400C67Baa4eF7874  100   0     0
    0xF8BB0d497Ac1b451d42021eF85d45E9baE89f5a1  0     200   0

Deploying exchange...
  exchange deployed at: 0x227fC2F7105CdF911222375a4E70e6a1220ca76D
Init Offer...
  Reading all offers...
    id  initiator                                   offers  offersAmount  wants  wantsAmount  acceptor
    --  ------------------------------------------  ------  ------------  -----  -----------  ------------------------------------------
    1   0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976  TKA     1000          TKB    2000         0x0000000000000000000000000000000000000000
    2   0x6c024522f9867D0e627fAC2786Ae791dc282ef70  TKB     2000          TKC    3000         0x0000000000000000000000000000000000000000
    3   0x90f7d0873FE5AA1a2132BF427385b462DC652fca  TKC     3000          TKA    1000         0x0000000000000000000000000000000000000000
    4   0x5595988DeabcD21c3EbF7939400C67Baa4eF7874  TKA     100           TKB    200          0x0000000000000000000000000000000000000000

  0xF8BB0d497Ac1b451d42021eF85d45E9baE89f5a1 accepting offer 4
  Reading all balances...
    account                                     TKA   TKB   TKC
    ------------------------------------------  ----  ----  ----
    0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976  5000  0     0
    0x6c024522f9867D0e627fAC2786Ae791dc282ef70  0     5000  0
    0x90f7d0873FE5AA1a2132BF427385b462DC652fca  0     0     5000
    0x5595988DeabcD21c3EbF7939400C67Baa4eF7874  0     200   0
    0xF8BB0d497Ac1b451d42021eF85d45E9baE89f5a1  100   0     0

  Reading all offers...
    id  initiator                                   offers  offersAmount  wants  wantsAmount  acceptor
    --  ------------------------------------------  ------  ------------  -----  -----------  ------------------------------------------
    1   0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976  TKA     1000          TKB    2000         0x0000000000000000000000000000000000000000
    2   0x6c024522f9867D0e627fAC2786Ae791dc282ef70  TKB     2000          TKC    3000         0x0000000000000000000000000000000000000000
    3   0x90f7d0873FE5AA1a2132BF427385b462DC652fca  TKC     3000          TKA    1000         0x0000000000000000000000000000000000000000
    4   0x5595988DeabcD21c3EbF7939400C67Baa4eF7874  TKA     100           TKB    200          0xF8BB0d497Ac1b451d42021eF85d45E9baE89f5a1
```

## Case 2
Multi-party trading
```
$ ./run.2.js
Deploying tokenFactory...
  tokenFactory deployed at: 0xE00a2c2110E219F235158d302E487830931F1853
Creating tokens...
  TKA deployed at: 0xc8f19bb2ED11c175Dfc10A8aaA26D5272dC1bbc7
  TKB deployed at: 0xe0C5C86368c10f7a16d3D051a3a3A22DC8642Be9
Init Balance...
  Reading all balances...
    account                                     TKA   TKB
    ------------------------------------------  ----  ----
    0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976  1000  0
    0x6c024522f9867D0e627fAC2786Ae791dc282ef70  0     500
    0x90f7d0873FE5AA1a2132BF427385b462DC652fca  0     1500

Deploying exchange...
  exchange deployed at: 0xD79DCbea306afa1184989E9aAC2C38c7F2a0A48f
Init Offer...
  Reading all offers...
    id  selling  tSell  cSell  buying  tBuy  cBuy  sellers  buyers
    --  -------  -----  -----  ------  ----  ----  -------  ------
    1   TKA      1000   0      TKB     2000  0

  adding 0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976 to offer 1, selling 1000
  adding 0x6c024522f9867D0e627fAC2786Ae791dc282ef70 to offer 1, buying 500
  adding 0x90f7d0873FE5AA1a2132BF427385b462DC652fca to offer 1, buying 1500
  Reading all offers...
    id  selling  tSell  cSell  buying  tBuy  cBuy  sellers                                           buyers
    --  -------  -----  -----  ------  ----  ----  ------------------------------------------------  -------------------------------------------------------------------------------------------------
    1   TKA      1000   1000   TKB     2000  2000  0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976: 1000  0x6c024522f9867D0e627fAC2786Ae791dc282ef70: 500, 0x90f7d0873FE5AA1a2132BF427385b462DC652fca: 1500

  Reading all balances...
    account                                     TKA  TKB
    ------------------------------------------  ---  ----
    0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976  0    2000
    0x6c024522f9867D0e627fAC2786Ae791dc282ef70  250  0
    0x90f7d0873FE5AA1a2132BF427385b462DC652fca  750  0
```


## Case 3
Delegated trading
```
$ ./run.3.js
Deploying tokenFactory...
  tokenFactory deployed at: 0xB400CA94aefEA27C50570455cb4E602eE3594324
Creating tokens...
  TKA deployed at: 0xAB92548290ba68699b66f52eBce146B384D12E1E
  TKB deployed at: 0x71950cC798498f9D5E0d62B9d6149641569fc952
  TKC deployed at: 0xE27BE2a5ca40F38Af203E3907fecD2cC75BF398e
Init Balance...
  Reading all balances...
    account                                     TKA   TKB   TKC
    ------------------------------------------  ----  ----  ----
    0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976  1000  0     0
    0x6c024522f9867D0e627fAC2786Ae791dc282ef70  0     2000  0
    0x90f7d0873FE5AA1a2132BF427385b462DC652fca  0     0     3000
    0x5595988DeabcD21c3EbF7939400C67Baa4eF7874  0     0     0

Deploying exchange...
  exchange deployed at: 0x7bFA88CCB8B15C5713a4ca04459d0f023DFA3a8f
Running...
  0x5595988DeabcD21c3EbF7939400C67Baa4eF7874 initing delegation for 1000 TKA at 5000 ppm...
  0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976 signing delegation 1
  Reading all delegations...
    id  agent                                       token  tAmount  cAmount  ppm   client
    --  ------------------------------------------  -----  -------  -------  ----  ------------------------------------------
    1   0x5595988DeabcD21c3EbF7939400C67Baa4eF7874  TKA    1000     0        5000  0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976

Offer...
  0x5595988DeabcD21c3EbF7939400C67Baa4eF7874 initing delegated offer, amount: 500, wants 2000 TKB
  0x5595988DeabcD21c3EbF7939400C67Baa4eF7874 initing delegated offer, amount: 500, wants 3000 TKC
  0x6c024522f9867D0e627fAC2786Ae791dc282ef70 accepting delegated offer 1
  0x90f7d0873FE5AA1a2132BF427385b462DC652fca accepting delegated offer 2
  Reading all offers...
    id  offers  offersAmount  wants  wantsAmount  acceptor
    --  ------  ------------  -----  -----------  ------------------------------------------
    1   TKA     500           TKB    2000         0x6c024522f9867D0e627fAC2786Ae791dc282ef70
    2   TKA     500           TKC    3000         0x90f7d0873FE5AA1a2132BF427385b462DC652fca

  Reading all delegations...
    id  agent                                       token  tAmount  cAmount  ppm   client
    --  ------------------------------------------  -----  -------  -------  ----  ------------------------------------------
    1   0x5595988DeabcD21c3EbF7939400C67Baa4eF7874  TKA    1000     1000     5000  0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976

  Reading all balances...
    account                                     TKA  TKB   TKC
    ------------------------------------------  ---  ----  ----
    0x47a6B0bB1f613071fA9D1Ff86bDeFF2B8ee79976  0    1990  2985
    0x6c024522f9867D0e627fAC2786Ae791dc282ef70  500  0     0
    0x90f7d0873FE5AA1a2132BF427385b462DC652fca  500  0     0
    0x5595988DeabcD21c3EbF7939400C67Baa4eF7874  0    10    15
```