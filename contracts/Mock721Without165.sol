// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Mock721Without165 is ERC721 {
    constructor() ERC721("Mock721", "MERC") {}

    function safeMint(address _to, uint256 _tokenId) public {
        _safeMint(_to, _tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        return false;
    }
}
