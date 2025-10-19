export const contractAbi = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'pinger',
        type: 'address',
      },
    ],
    name: 'NewPinger',
    type: 'event',
  },
  { anonymous: false, inputs: [], name: 'Ping', type: 'event' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'txHash',
        type: 'bytes32',
      },
    ],
    name: 'Pong',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'address', name: '_pinger', type: 'address' }],
    name: 'changePinger',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'ping',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pinger',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_txHash', type: 'bytes32' }],
    name: 'pong',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export const contractBytecode =
  '608060405234801561001057600080fd5b50600080546001600160a01b03191633179055610291806100326000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c806305ba79a2146100515780630860f3b0146100665780635c36b18614610079578063b97399f514610081575b600080fd5b61006461005f3660046101ef565b61009f565b005b6100646100743660046101c1565b6100d9565b61006461015d565b6100896101b2565b6040516100969190610207565b60405180910390f35b7f67050610046771547cf1d6e467b904ccfc523370eebc895dad1d9a73349b9804816040516100ce919061021b565b60405180910390a150565b6000546001600160a01b0316331461010c5760405162461bcd60e51b815260040161010390610224565b60405180910390fd5b600080546001600160a01b0319166001600160a01b0383811691909117918290556040517f2f370de2916d79e147ab3994047775d4c93d478ac1f844ce0b1c4bcfba364277926100ce921690610207565b6000546001600160a01b031633146101875760405162461bcd60e51b815260040161010390610224565b6040517fca6e822df923f741dfe968d15d80a18abd25bd1e748bcb9ad81fea5bbb7386af90600090a1565b6000546001600160a01b031681565b6000602082840312156101d2578081fd5b81356001600160a01b03811681146101e8578182fd5b9392505050565b600060208284031215610200578081fd5b5035919050565b6001600160a01b0391909116815260200190565b90815260200190565b6020808252601e908201527f4f6e6c79207468652070696e6765722063616e2063616c6c20746869732e000060408201526060019056fea2646970667358221220a89f48003973edc9dd0b0ad9463ef8b46620b47b5abfa7ea166c4d049b64716b64736f6c63430008010033';
