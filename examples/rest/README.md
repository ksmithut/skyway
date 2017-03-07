# skyway REST example

To run the example, from the root of the project, run `node examples/rest`.

Use the following curl commands to play around with the api:

```sh
# Create a user
curl -X POST http://localhost:8000/api/v1/users \
  -H 'Content-Type: application/json' \
  -d '{ "username": "admin", "password": "password" }'

# List users
curl http://admin:password@localhost:8000/api/v1/users

# Get single user
curl http://admin:password@localhost:8000/api/v1/users/0

# Update a user
curl -X PUT http://admin:password@localhost:8000/api/v1/users/0 \
  -H 'Content-Type: application/json' \
  -d '{ "password": "my-new-password" }'

# Delete a user
curl -X DELETE http://admin:my-new-password@localhost:8000/api/v1/users/0
```
