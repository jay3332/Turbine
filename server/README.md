# Turbine Backend
This directory contains the source of Terbium's backend server and REST API.

## REST API Documentation
Integrate Turbine into your own application by using the Turbine's REST API.

### Official Base URI
Prefix all endpoints with the official backend URI: **https://pastebackend.bobobot.cf/api**

### Table of Contents
- [Miscellaneous Endpoints](#miscellaneous-endpoints)

### Miscellaneous Endpoints

#### Ping the Server
**GET /**

This endpoint is used to check if the server is running.

##### Successful Response
You should expect a 200 OK with the following body:

Content-Type: text/plain
```
Hello, world!
```

### Paste Endpoints

#### Get Paste
**GET /pastes/:id**

Used to retrieve the data of a paste by its ID.

##### Authorization (Optional)
[See the Authorization section for more information.](#using-authorization)

Passing in a user token will allow you to retrieve pastes that are private to the
authorized user or bypass password protection for pastes that are owned by the
authorized user.

##### URL Path Parameters
- `:id`: The ID of the paste to retrieve.

##### URL Query Parameters
- `password` (optional): If this paste is password protected, the password to access the paste.

##### Successful Response
You should expect a 200 OK with the following body:

Content-Type: application/json  
Schema: [Paste Object](#paste-object)

##### Failure Responses
- 401 Unauthorized
  - The paste is password protected and the password is incorrect.
  - The paste is private and the user is not authorized.
- 404 Not Found
  - The paste does not exist.

#### Create Paste
**POST /pastes**

Used to create a new paste.

##### Authorization (Optional)
[See the Authorization section for more information.](#using-authorization)

Passing in a user token will allow you to create pastes that are private to the
authorized user or allow password protection to be bypassed if it is accessed by
the authorized user. Additionally, the created paste will have its owner assigned
to the authorized user.

##### Request Body
This endpoint only accepts a content-type of application/json with the JSON body
containing the following fields:

| Field        | Type                                              | Description                                                                                                                            |
|--------------|---------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| name?        | string                                            | The title of the paste. Defaults to `Untitled Paste`.                                                                                  |
| description? | string                                            | The description of the paste.                                                                                                          |
| visibility   | [paste visibility](#paste-visibility-enumeration) | The visibility of the paste. Defaults to `2` (unlisted).                                                                               |
| password?    | string                                            | The password of the paste. Only required if the visbiility of this paste is `1` (password protected), otherwise this field is ignored. |
| files        | array of [file](#file-object)s                    | The files associated with this paste.                                                                                                  |

##### Successful Response
You should expect a 201 Created status code with the following body:

Content-Type: application/json  
Schema: A JSON object with one single field, `id` which contains the ID of the newly created paste.

##### Failure Responses
- 400 Bad Request
  - The request body does not match the JSON schema.
  - No `password` field was received and the paste visibility was set to 1 (password protected).

### Using Authorization
If an endpoint accepts authorization, you can pass in a user token as the value of
the `Authorization` header.

To generate a user token, make a request to the [Login Endpoint](#login) and grab the `token` field
of the JSON response (if everything goes well).

Some endpoints are mandatory to be authorized. In such a scenario, you will see **Authorization (Required)** in the
endpoint documentation.

#### Delete Paste
**DELETE /pastes/:id**

Used to delete a paste. You can only delete pastes you own.

##### Authorization (Required)
[See the Authorization section for more information.](#using-authorization)

Authorization is required for the server to compare the owner of the paste to the
authorized user to check whether they own the paste, and whether they are allowed
to delete the paste.

##### Successful Response
You should expect a 204 No Content status code.

##### Failure Responses
- 403 Forbidden
  - The user is not allowed to delete the paste.
- 404 Not Found
  - The paste does not exist.

### JSON Object Schemas
Any field postfixed with `?` is optional, e.g. `name?`.

All Unix timestamps are measured in **seconds**.

#### File Object
| Field     | Type                  | Description                                                                   |
|-----------|-----------------------|-------------------------------------------------------------------------------|
| filename? | string                | The filename of the file                                                      |
| content   | string <sup>[1]</sup> | The contents of the file                                                      |
| language? | string                | The syntax highlighting to use when displaying the file, for example `Python` |

[1] Subject to change to `bytes` (possibly compressed) in the future

#### Paste Object
| Field        | Type                                              | Description                                       |
|--------------|---------------------------------------------------|---------------------------------------------------|
| id           | string                                            | The ID of the paste.                              |
| author_id?   | string                                            | The ID of the user who created the paste.         |
| author_name? | string                                            | The username of the user who created the paste.   |
| name         | string                                            | The title of the paste.                           |
| description? | string                                            | The description of the paste.                     |
| visibility   | [paste visibility](#paste-visibility-enumeration) | The visibility of the paste.                      |
| files        | array of [file](#file-object)s                    | The files contained in the paste.                 |
| created_at   | integer (unix timestamp)                          | The Unix timestamp of when the paste was created. |
| views        | integer                                           | The number of times the paste has been viewed.    |
| stars        | integer                                           | The amount of stars the paste has received.       |

#### Paste Visibility Enumeration
| Value | Description        |
|-------|--------------------|
| 0     | Private            |
| 1     | Password protected |
| 2     | Unlisted (default) |
| 3     | Discoverable       |
