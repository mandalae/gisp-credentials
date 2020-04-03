provider "aws" {
  region = "eu-west-1"
}

resource "aws_lambda_permission" "GPCovidResponse-Credentials" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.GPCovidResponse-Credentials.function_name}"
  principal     = "apigateway.amazonaws.com"
}

resource "aws_lambda_function" "GPCovidResponse-Credentials" {
  filename      = "../artifact/covid-backend.zip"
  function_name = "GPCovidResponse-Credentials"
  role          = "arn:aws:iam::368263227121:role/service-role/lambda-dynamodb"
  handler       = "index.handler"
  source_code_hash = "${filebase64sha256("../artifact/covid-backend.zip")}"
  runtime       = "nodejs12.x"

}
