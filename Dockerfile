FROM amazon/aws-lambda-nodejs:18

# copy source code
COPY ./app/* ${LAMBDA_TASK_ROOT}
# install npm dependencies
WORKDIR /app
RUN npm install

CMD ["app.handler"]
