const express = require("express");
const axios = require("axios");
const app = express();

const BASE_URL = "http://20.244.56.144/test";
const USERS_URL = `${BASE_URL}/users`;
const USER_POSTS_URL = `${BASE_URL}/users`;
const POST_COMMENTS_URL = `${BASE_URL}/posts`;

const CACHE_TTL = 30 * 1000; // 30 seconds

let usersCache = { data: null, timestamp: 0 };
let postsCache = { data: null, timestamp: 0 };

async function fetchUsers() {
  if (!usersCache.data || Date.now() - usersCache.timestamp > CACHE_TTL) {
    try {
      const response = await axios.get(USERS_URL);
      usersCache.data = response.data.users;
      usersCache.timestamp = Date.now();
    } catch (error) {
      console.error("Error fetching users:", error.message);
      usersCache.data = {};
    }
  }
  return usersCache.data;
}

async function fetchPostsForUser(userId) {
  try {
    const response = await axios.get(`${USER_POSTS_URL}/${userId}/posts`);
    return response.data.posts;
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error.message);
    return [];
  }
}
async function fetchAllPosts() {
  if (!postsCache.data || Date.now() - postsCache.timestamp > CACHE_TTL) {
    let allPosts = [];
    const users = await fetchUsers();
    const userIds = Object.keys(users);
    for (let userId of userIds) {
      const userPosts = await fetchPostsForUser(userId);
      // Append username to each post.
      userPosts.forEach((post) => {
        post.username = users[userId] || "Unknown";
      });
      allPosts = allPosts.concat(userPosts);
    }
    postsCache.data = allPosts;
    postsCache.timestamp = Date.now();
  }
  return postsCache.data;
}

async function fetchCommentCountForPost(postId) {
  try {
    const response = await axios.get(`${POST_COMMENTS_URL}/${postId}/comments`);
    const comments = response.data.comments;
    return comments ? comments.length : 0;
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error.message);
    return 0;
  }
}

app.get("/users", async (req, res) => {
  const users = await fetchUsers();
  let userPostCounts = {};
  const userIds = Object.keys(users);

  for (let userId of userIds) {
    const posts = await fetchPostsForUser(userId);
    userPostCounts[userId] = posts.length;
  }

  let sortedUsers = Object.entries(userPostCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => ({
      userid: userId,
      username: users[userId] || "Unknown",
      post_count: count,
    }));

  res.json({ top_users: sortedUsers });
});

app.get("/posts", async (req, res) => {
  const type = req.query.type;
  const allPosts = await fetchAllPosts();

  if (type === "latest") {
    // Sort posts by post id descending (assumes higher id means newer).
    const sortedPosts = allPosts.sort((a, b) => b.id - a.id);
    const latestPosts = sortedPosts.slice(0, 5);
    return res.json({ latest_posts: latestPosts });
  } else if (type === "popular") {
    let maxCommentCount = 0;
    let postComments = {};

    //comments count for each ost.
    for (let post of allPosts) {
      const count = await fetchCommentCountForPost(post.id);
      postComments[post.id] = count;
      if (count > maxCommentCount) {
        maxCommentCount = count;
      }
    }

    // filter posts with max. comments
    const popularPosts = allPosts
      .filter((post) => postComments[post.id] === maxCommentCount)
      .map((post) => ({ ...post, comment_count: maxCommentCount }));

    return res.json({ popular_posts: popularPosts });
  } else {
    return res
      .status(400)
      .json({
        error: "Invalid type parameter. Accepted values: latest, popular.",
      });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Social Media Analytics Microservice running on port ${PORT}`);
});
