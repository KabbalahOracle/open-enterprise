pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/common/IForwarder.sol";


contract DiscussionApp is IForwarder, AragonApp {
    using SafeMath for uint256;

    event Post(address indexed author, string postCid, string discussionThreadId, uint postId, uint createdAt);
    event Revise(address indexed author, string revisedPostCid, string discussionThreadId, uint postId, uint createdAt, uint revisedAt);
    event Hide(address indexed author, string discussionThreadId, uint postId, uint hiddenAt);
    event CreateDiscussionThread(uint actionId, bytes _evmScript);

    bytes32 constant public DISCUSSION_POSTER_ROLE = keccak256("DISCUSSION_POSTER_ROLE");
    string private constant ERROR_CAN_NOT_FORWARD = "DISCUSSIONS_CAN_NOT_FORWARD";

    struct DiscussionPost {
        address author;
        string postCid;
        string discussionThreadId;
        uint id;
        uint createdAt;
        bool show;
        string[] revisionCids;
    }

    uint discussionThreadId;

    mapping(address => DiscussionPost[]) public userPosts;

    function initialize() public onlyInit {
        discussionThreadId = 0;
        initialized();
    }

    /**
     * @notice Create discussion post with an IPFS content hash '`postCid`'.
     * @param postCid The IPFS content hash of the discussion post data
     * @param discussionThreadId The thread to post this discussion to
     */
    function post(string postCid, string discussionThreadId) external auth(DISCUSSION_POSTER_ROLE) {
        DiscussionPost storage post;
        post.author = msg.sender;
        post.postCid = postCid;
        post.discussionThreadId = discussionThreadId;
        post.createdAt = now;
        post.show = true;
        uint postId = userPosts[msg.sender].length;
        post.id = postId;
        userPosts[msg.sender].push(post);
        emit Post(msg.sender, postCid, discussionThreadId, postId, now);
    }

    /**
     * @notice Hide a discussion post with ID '`postId`'.
     * @param postId The postId to hide
     * @param discussionThreadId The thread to hide this discussion from
     */
    function hide(uint postId, string discussionThreadId) external auth(DISCUSSION_POSTER_ROLE) {
        DiscussionPost storage post = userPosts[msg.sender][postId];
        require(post.author == msg.sender, "You cannot hide a post you did not author.");
        post.show = false;
        emit Hide(msg.sender, discussionThreadId, postId, now);
    }

    function revise(string revisedPostCid, uint postId, string discussionThreadId) external auth(DISCUSSION_POSTER_ROLE) {
        DiscussionPost storage post = userPosts[msg.sender][postId];
        require(post.author == msg.sender, "You cannot revise a post you did not author.");
        // add the current post to the revision history
        // should we limit the number of revisions you can make to save storage?
        post.revisionCids.push(post.postCid);
        post.postCid = revisedPostCid;
        emit Revise(msg.sender, revisedPostCid, discussionThreadId, postId, post.createdAt, now);
    }

    // Forwarding fns

    /**
    * @notice Tells whether the Voting app is a forwarder or not
    * @dev IForwarder interface conformance
    * @return Always true
    */
    function isForwarder() external pure returns (bool) {
        return true;
    }

    /**
    * @notice Creates a vote to execute the desired action, and casts a support vote if possible
    * @dev IForwarder interface conformance
    * @param _evmScript Start vote with script
    */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_CAN_NOT_FORWARD);
        bytes memory input = new bytes(0); // TODO: Consider input for this
        address[] memory blacklist = new address[](1);
        CreateDiscussionThread(discussionThreadId, _evmScript);
        discussionThreadId = discussionThreadId + 1;
        runScript(_evmScript, input, blacklist);
    }

    /**
    * @notice Tells whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can create votes, false otherwise
    */
    function canForward(address _sender, bytes) public view returns (bool) {
        return true;
    }
}