# [AWS Lambda Image Resizer using Node.js](https://dynamic-aws-lambda-image-resizer-nodejs.mreda.net/)

An [AWS Lambda Function](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
to resize S3 images using Node.js on the fly.

A detailed, screenshot-ed, step-by-step guide can be found [here](https://dynamic-aws-lambda-image-resizer-nodejs.mreda.net/).

### How Do Images Get Resized?
1. User requests an image from the API Gateway.
2. API Gateway triggers the Lambda Function.
3. Lambda function runs basic validations on user input.
4. The function checks if a resized image exists on S3 Bucket.
5. If a resized image exists, image is returned as a response to the API Gateway.
6. If no resized image found, a new resized version is created on the fly and saved to S3 Bucket.
7. Resized image is returned as a response to the API Gateway.

#### AWS Services Used
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
- [Amazon S3](https://aws.amazon.com/api-gateway/)
- [AWS IAM](https://aws.amazon.com/iam/)
- (Optional) [Amazon Cloud Watch](https://us-east-2.console.aws.amazon.com/cloudwatch/home)

### Prerequisites
- AWS Console root access.
- OR, AWS Console full access to the four [AWS Services above](#aws-services-used).

### Setup
1. Setup S3 Bucket.
    - Open AWS Console and go to [S3 Home](https://s3.console.aws.amazon.com/s3/home).
    - Click on `Create bucket` button.
    - Choose a name and a region for your new bucket.
    - Keep a note of the bucket name, we will need it later.
    - Click on `Create bucket`.

2. Setup IAM Role.
    - Go to [IAM Home](https://console.aws.amazon.com/iam/home), then under `Access management` click on `Roles`.
    - Click on `Create role` button.
    - Under `Select type of trusted entity` select `AWS Service (EC2, Lambda and others)`.
    - Under `Choose a use case` select `Lambda`.
    - Click on `Next: Permissions`.
    - Click on `Create policy`.
    - Switch to JSON tab, then copy and paste the below.
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Resource": "arn:aws:s3:::YOUR_S3_BUCKET_NAME/*",
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject"
                ]
            }
        ]
    }
    ```
    - Don't forget to replace `YOUR_S3_BUCKET_NAME` with your created S3 Bucket Name.
    - Click on `Next: Tags`.
    - Click on `Next: Review`.
    - Click on `Review policy`.
    - Set a name for the new policy and click `Create policy`.
    - Go back to Create IAM Role page, hit the refresh button, search for and select the policy you just created.
    - Click on `Next: Tags`.
    - Click on `Next: Review`.
    - Enter a name for the new role and click `Create role`.
    - (Optional) if you would like to log API Gateway calls to [Amazon Cloudwatch](https://us-east-2.console.aws.amazon.com/cloudwatch/home)
        - Click to edit the role you just created.
        - Click on `Attach policies`.
        - Type and select `AmazonAPIGatewayPushToCloudWatchLogs` from the Filter policies search box.
        - Click `Attach policy`.

3. Setup Lambda Function
    - Go to [Lambda Home](https://us-east-2.console.aws.amazon.com/lambda/home).
    - Click on `Create function`.
    - Under `Choose one of the following options to create your function` choose `Author from scratch`.
    - For Runtime, choose `Node.js 18.x`.
    - Under permissions, choose `Use an existing role`, then from roles list select the role you just created.
    - Click on `Create function`.
    - Under `Function code` section, click to expand `Actions` dropdown the click `Upload a .zip file`.
    - Download the [Build file](https://github.com/MuhammadReda/nodejs-aws-lambda-image-resizer/releases/download/v1.5.40/build-v1.5.40.zip) and upload it as your Lambda function source code. 
    - Under `Environment variables` section, click `Edit`.
    - Click `Add environment variable`.
    - For `Key` type `BUCKET` and for `Value` paste in `YOUR_S3_BUCKET_NAME`.
    - (Optional) If you would like to restrict resizing images to predefined dimensions, click `Add environment variable`.
        - For `Key` type `WHITELISTED_DIMENSIONS` and for `Value` type your predefined dimensions separated by a space, for example `320x280 640x480 1200x800`. 
    - Click `Save`.

4. Setup API Gateway
    - Go to [API-Gateway APIs](https://console.aws.amazon.com/apigateway/main/apis).
    - Under `Choose an API type` spot `HTTP API` block and click on `Build`.
    - Type your API name under `API name`.
    - Click on `Review and Create`. (don't worry, you will come back later)
    - Click on `Create`.
    - From the menu on the left, under `Develop`, click on `Routes`.
    - Click on `Create` button.
    - For Method choose `GET` and for Route Path `/{proxy+}`.
    - Click on `Create`.
    - Now you should see the route you created under Routes Block. Click on the Method you just created `GET`.
    - `Route details` should show, click on `Attach integration`.
    - Click on `Create and attach integration`.
    - Under `Integration target`, `Integration type` select `Lambda function`.
    - Under `Integration details`, `Integration target` select your Lambda function region under `AWS Region` and your Lambda function under `Lambda function`.
    - Click on `Create`.
    - From the menu on the left, under `Deploy`, click on `Stages`.
    - Click on `Create`.
    - Under `Stage details`, enter a stage name. For example `production`.
    - Click on `Create`.
    - Click on `Deploy` button on the top right.
    - Select the stage you just created from under `Select a stage`.
    - Click on `Deploy to stage`.
    - API URL should now appear under `Invoke URL`. Copy it as that's the URL to be used to resize images.

5. Finally, resize images using AWS Lambda!
    - Resized image URL structure:
    ```
    # Resize using Width and Height.

    {api_gatewau_url}/{width}x{height}/{s3_object_path}
    # example: https://dh12oluo25.execute-api.us-east-1.amazonaws.com/production/180x120/image.png
    # example: https://dh12oluo25.execute-api.us-east-1.amazonaws.com/production/640x480/path/to/image.jpeg
    ```
    OR
    ```
    # Resize using Width, Height and Fit.

    {api_gatewau_url}/{width}x{height}_{fit}/{s3_object_path}
    # example: https://dh12oluo25.execute-api.us-east-1.amazonaws.com/production/180x120_fill/image.png
    # example: https://dh12oluo25.execute-api.us-east-1.amazonaws.com/production/640x480_inside/another/path/to/image.jpg
    ```
    - URL variables explained:
        - `{api_gateway_url}`: The API Gateway URL. Example `https://dh12oluo25.execute-api.us-east-1.amazonaws.com/production`.
        - `{width}`: Image width in pixels or 'auto'.
        - `{height}`: Image height in pixels or 'auto'.
        - `{fit}`: [Sharp.js image fit](https://sharp.pixelplumbing.com/api-resize#resize). Defaults to 'cover'.
        - `{s3_object_path}`: Path to image inside S3 Bucket. 


## Build Your Own AWS Lambda Image Resizer
Because requirements always differ and there's no one magic size fits all,
this simple resizer is designed so you can modify the original script to match your requirements
and then rebuild it in order to be published to your own AWS Lambda Function.

This resizer is making use of [Sharp](https://sharp.pixelplumbing.com/) to resize images. A build script is included in 
the package.json file which makes sure that the Sharp linux binaries are added to package.

Run the build script after making your changes to index.js, you will find a new zip file in /app/dist when in runs successfully.
```bash
npm run build
```

A docker file is included for testing purposes. See the [amazon documentation](https://hub.docker.com/r/amazon/aws-lambda-nodejs) on how to test your function.

1. Download and install [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/).


2. After making a change to the string, rerun the docker compose command.
```bash
docker compose up --build
```

7. Press <kbd>ctrl</kbd>+<kbd>c</kbd> to kill the running container.

8. Upload .zip build file to your AWS Lambda function.

#### Documentation
[Here](https://dynamic-aws-lambda-image-resizer-nodejs.mreda.net/)

#### Issues and feature requests
[Here](https://github.com/MuhammadReda/nodejs-aws-lambda-image-resizer/issues)

#### License
[MIT](https://github.com/MuhammadReda/nodejs-aws-lambda-image-resizer/blob/master/LICENSE)

#### Credits
- SagidM's [s3-resizer](https://github.com/sagidM/s3-resizer).
