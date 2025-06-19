### Create a Post

- **URL:** `/api/posts`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
      "username": "test_user",
      "imageUrl": "some_image_url.jpg",
      "caption": "This is a test post!"
  }