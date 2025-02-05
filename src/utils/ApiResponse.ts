//Api response for a failed request
class ApiError extends Error {
    statusCode: number
    data: null
    success: boolean
    error: any[]
    constructor(
        statusCode: number,
        message: string = "Something went wrong🔴🔴!",
        error: any[] = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.error = error
        this.success = false

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

//Api response for a successfull request
class ApiSuccess {
    statusCode: number
    data: any
    message: string
    success: boolean
    constructor(
        statusCode: number,
        message: string = "Request successfull!",
        data: any,
    ) {
        this.statusCode = statusCode
        this.message = message
        this.data = data
        this.success = statusCode < 400 //if response code > 400 return false
    }
}

export { ApiError, ApiSuccess }