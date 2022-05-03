// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.5.0) (token/ERC721/ERC721.sol)

pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IVault.sol";

contract Vault is Context, ERC165, ERC721, IVault {
    string internal constant _name = "NAME";
    string internal constant _symbol = "SCV";
    string private _baseTokenURI = "https://";
    string private _contractURI = "https://";
    Counters.Counter internal _tokenIdCounter;

    enum VaultState {
        OPEN,
        CLOSED,
        DESTROYED
    }

    struct Token {
        address tokenAddress;
        uint256 tokenId;
        uint256 listPtr;
    }

    mapping(uint256 => VaultState) internal _state; // vaultId -> VaultState
    mapping(uint256 => Token[]) internal _tokens; // vaultId -> Token
    mapping(uint256 => mapping(address => mapping(uint256 => uint256)))
        internal _listPtr; // vaultId -> address -> tokenId -> listPtr
    mapping(address => uint256[]) internal _vaults; // vaultOwners address -> vaultIds
    mapping(uint256 => address) internal _royaltyReceivers; // vaultId -> royaltyReceiver
    mapping(uint256 => uint256) internal _royaltyBasisPoints; // vaultId -> royaltyBasisPoints
    mapping(uint256 => string) internal _tokenURIs;
    mapping(uint256 => uint256) internal _vaultOpenBlock; // vaultId -> openCoolDown

    using Address for address;
    using Strings for uint256;
    using Counters for Counters.Counter;

    constructor() ERC721(_name, _symbol) {}

    modifier onlyVaultOwner(uint256 _vaultId) {
        require(_exists(_vaultId), "Vault: Vault doesn't exists");
        require(ownerOf(_vaultId) == _msgSender(), "Vault: Only vault owner");
        _;
    }

    function create(address _to, string memory _uri) public {
        // effects
        uint256 vaultId = tokenIdCounter();
        _state[vaultId] = VaultState.OPEN;
        _vaults[_to].push(vaultId);
        _vaultOpenBlock[vaultId] = block.timestamp;

        // integrations
        safeMint(_to, _uri);

        // events
        emit VaultCreated(vaultId, _to, _msgSender(), _uri);
    }

    function add(
        uint256 _vaultId,
        address _tokenAddress,
        uint256 _tokenId
    ) public onlyVaultOwner(_vaultId) {
        // Checks
        // Vault checks
        require(
            _state[_vaultId] == VaultState.OPEN,
            "Vault: Vault is not open"
        );

        // _tokenAddress checks
        require(_tokenAddress != address(0), "Vault: _tokenAddress can't be 0");
        require(
            _tokenAddress != address(this),
            "Vault: _tokenAddress can't be vault"
        );
        require(
            IERC165(_tokenAddress).supportsInterface(type(IERC165).interfaceId),
            "Vault: _tokenAddress not IERC165"
        );
        require(
            IERC165(_tokenAddress).supportsInterface(type(IERC721).interfaceId),
            "Vault: _tokenAddress not IERC721"
        );

        IERC721 erc721 = IERC721(_tokenAddress);
        address tokenOwner = erc721.ownerOf(_tokenId);
        bool approved = erc721.isApprovedForAll(tokenOwner, address(this)) ||
            (erc721.getApproved(_tokenId) == address(this));
        require(approved, "Vault: not approved");

        // Effects
        uint256 nrTokens = _tokens[_vaultId].length;
        Token memory token = Token(_tokenAddress, _tokenId, nrTokens);
        _tokens[_vaultId].push(token);

        _listPtr[_vaultId][_tokenAddress][_tokenId] = nrTokens;

        // Integrations
        erc721.safeTransferFrom(tokenOwner, address(this), _tokenId);

        // Events
        emit TokenAdded(
            _vaultId,
            ownerOf(_vaultId),
            _msgSender(),
            _tokenId,
            _tokenAddress
        );
    }

    function remove(
        uint256 _vaultId,
        address _tokenAddress,
        uint256 _tokenId
    ) public onlyVaultOwner(_vaultId) {
        // Checks
        require(
            _state[_vaultId] == VaultState.OPEN,
            "Vault: Vault is not open"
        );
        require(_tokens[_vaultId].length > 0, "Vault: Vault is empty");
        require(
            isTokenInVault(_vaultId, _tokenAddress, _tokenId),
            "Vault: Token not in vault"
        );

        // Effects
        uint256 listPtr = _listPtr[_vaultId][_tokenAddress][_tokenId];
        Token memory token = _tokens[_vaultId][listPtr];

        if (_tokens[_vaultId].length == 1) {
            _tokens[_vaultId].pop();
        } else {
            uint256 nrTokens = _tokens[_vaultId].length;
            Token memory lastToken = _tokens[_vaultId][nrTokens - 1];
            lastToken.listPtr = listPtr;
            _tokens[_vaultId][listPtr] = lastToken;
            _listPtr[_vaultId][lastToken.tokenAddress][
                lastToken.tokenId
            ] = listPtr;
            _tokens[_vaultId].pop();
        }

        // Integrations
        IERC721 erc721 = IERC721(token.tokenAddress);
        erc721.safeTransferFrom(address(this), _msgSender(), token.tokenId);

        emit TokenRemoved(
            _vaultId,
            ownerOf(_vaultId),
            _tokenId,
            token.tokenAddress
        );
    }

    function destroy(uint256 _vaultId) public onlyVaultOwner(_vaultId) {
        // Checks
        require(
            _state[_vaultId] == VaultState.CLOSED,
            "Vault: Vault is not closed"
        );
        address _vaultOwner = ownerOf(_vaultId);

        // require all tokens to have been taken out of vault
        uint256 nrTokens = _tokens[_vaultId].length;
        require(nrTokens == 0, "Vault: Vault not empty");

        // Effects
        _state[_vaultId] = VaultState.DESTROYED;

        // remove vault from vault owners list
        bool found = false;
        uint256 indx;

        for (uint256 i = 0; i < _vaults[_vaultOwner].length; i++) {
            if (_vaults[_vaultOwner][i] == _vaultId) {
                found = true;
                indx = i;
                break;
            }
        }

        assert(found);

        if (_vaults[_vaultOwner].length == 1) {
            _vaults[_vaultOwner].pop();
        } else {
            _vaults[_vaultOwner][indx] = _vaults[_vaultOwner][
                _vaults[_vaultOwner].length - 1
            ];
            _vaults[_vaultOwner].pop();
        }

        // Integrations
        _burn(_vaultId);
        emit VaultDestroyed(_vaultId, msg.sender, _vaultOwner);
    }

    function close(uint256 _vaultId) public onlyVaultOwner(_vaultId) {
        // Checks
        require(
            _state[_vaultId] == VaultState.OPEN,
            "Vault: Vault is not open"
        );
        require(
            _vaultOpenBlock[_vaultId] < block.timestamp,
            "Vault: Closing in same block"
        );

        // Effects
        _state[_vaultId] = VaultState.CLOSED;
        emit VaultClosed(_vaultId, msg.sender);
    }

    function open(uint256 _vaultId) public onlyVaultOwner(_vaultId) {
        // Checks
        require(
            _state[_vaultId] == VaultState.CLOSED,
            "Vault: Vault was not closed"
        );

        // Effects
        _vaultOpenBlock[_vaultId] = block.timestamp;
        _state[_vaultId] = VaultState.OPEN;
        emit VaultOpened(_vaultId, msg.sender);
    }

    function isTokenInVault(
        uint256 _vaultId,
        address _tokenAddress,
        uint256 _tokenId
    ) public view returns (bool) {
        uint256 listPtr = _listPtr[_vaultId][_tokenAddress][_tokenId];
        if (listPtr < _tokens[_vaultId].length) {
            Token memory token = _tokens[_vaultId][listPtr];
            return ((token.tokenAddress == _tokenAddress) &&
                (token.tokenId == _tokenId));
        } else {
            return false;
        }
    }

    function isAllVaultsClosed(address _owner) public view returns (bool) {
        uint256[] memory ownedVaults = _vaults[_owner];
        for (uint256 i = 0; i < ownedVaults.length; i++) {
            uint256 vaultId = ownedVaults[i];
            if (_state[vaultId] == VaultState.OPEN) {
                return false;
            }
        }
        return true;
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721) {
        require(isAllVaultsClosed(from), "Vault: All vaults not closed");

        // remove vault from vault owners list
        bool found = false;
        uint256 indx;

        for (uint256 i = 0; i < _vaults[from].length; i++) {
            if (_vaults[from][i] == tokenId) {
                found = true;
                indx = i;
                break;
            }
        }

        assert(found);

        if (_vaults[from].length == 1) {
            _vaults[from].pop();
        } else {
            _vaults[from][indx] = _vaults[from][_vaults[from].length - 1];
            _vaults[from].pop();
        }

        // add vault to vault owners list
        _vaults[to].push(tokenId);

        super._transfer(from, to, tokenId);
    }

    function safeMint(address to, string memory uri) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function approve(address to, uint256 tokenId)
        public
        override(ERC721, IERC721)
    {
        require(
            _state[tokenId] == VaultState.CLOSED,
            "Vault: vault not closed"
        );

        super.approve(to, tokenId);
    }

    function getApproved(uint256 tokenId)
        public
        view
        override(ERC721, IERC721)
        returns (address)
    {
        require(
            _exists(tokenId),
            "ERC721: approved query for nonexistent token"
        );
        if (_state[tokenId] != VaultState.CLOSED) {
            return address(0);
        }

        return super.getApproved(tokenId);
    }

    function setApprovalForAll(address operator, bool approved)
        public
        override(ERC721, IERC721)
    {
        require(
            isAllVaultsClosed(_msgSender()),
            "Vault: All vaults not closed"
        );
        super.setApprovalForAll(operator, approved);
    }

    function isApprovedForAll(address owner, address operator)
        public
        view
        override(ERC721, IERC721)
        returns (bool)
    {
        return (super.isApprovedForAll(owner, operator) &&
            isAllVaultsClosed(owner));
    }

    // EIP2981 standard Interface return.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165, IERC165, ERC721)
        returns (bool)
    {
        return (interfaceId == type(IERC2981).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC165).interfaceId ||
            super.supportsInterface(interfaceId));
    }

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external pure returns (bytes4) {
        _operator;
        _from;
        _tokenId;
        _data;
        // emit Received(_operator, _from, _tokenId);
        return this.onERC721Received.selector;
    }

    function vaults(address _owner) external view returns (uint256[] memory) {
        return _vaults[_owner];
    }

    function state(uint256 _vaultId) external view returns (VaultState) {
        return _state[_vaultId];
    }

    function tokens(uint256 _vaultId) external view returns (Token[] memory) {
        return _tokens[_vaultId];
    }

    function tokenIdCounter() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function updateBaseTokenURI(string memory uri) public {
        _baseTokenURI = uri;
    }

    function updateContractURI(string memory uri) public {
        _contractURI = uri;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721)
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721URIStorage: URI query for nonexistent token"
        );

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }

        return _tokenURI;
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI)
        internal
        virtual
    {
        require(
            _exists(tokenId),
            "ERC721URIStorage: URI set of nonexistent token"
        );
        _tokenURIs[tokenId] = _tokenURI;
    }
}
