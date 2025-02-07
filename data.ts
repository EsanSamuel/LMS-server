//json file passed to postman to create quiz
const quiz_body = {
  title: "JavaScript Basics",
  courseId: "67a47cbe9346459991ac9ff3", // Replace with actual course ID
  userId: "123", // Replace with actual user ID
  questions: [
    {
      text: "Is JavaScript dynamically typed?",
      options: ["True", "False"],
      correctAnswer: "True",
    },
    {
      text: "Does JavaScript use curly braces?",
      options: ["True", "False"],
      correctAnswer: "True",
    },
    {
      text: "What is javascript classified as?",
      options: [
        "Object oriented language",
        "Functional language",
        "Structural language",
        "None of the above",
      ],
      correctAnswer: "Object oriented language",
    },
  ],
};

//quiz response gotten
const quiz_response = {
  statusCode: 200,
  message: "Quiz gotten from cache🟢🟢!",
  data: [
    {
      id: "67a54d3d0850c20a69ec4b47",
      title: "JavaScript Basics",
      userId: "67a3c2a2f6da6ad0d6555a0c",
      courseId: "67a47cbe9346459991ac9ff3",
      createdAt: "2025-02-07T00:00:58.512Z",
      questions: [
        {
          id: "67a54d3d0850c20a69ec4b48",
          text: "Is JavaScript dynamically typed?",
          options: ["True", "False"],
          createdAt: "2025-02-07T00:00:58.512Z",
          correctAnswer: "True",
          quizId: "67a54d3d0850c20a69ec4b47",
        },
        {
          id: "67a54d3d0850c20a69ec4b49",
          text: "Does JavaScript use curly braces?",
          options: ["True", "False"],
          createdAt: "2025-02-07T00:00:58.512Z",
          correctAnswer: "True",
          quizId: "67a54d3d0850c20a69ec4b47",
        },
        {
          id: "67a54d3d0850c20a69ec4b4a",
          text: "What is javascript classified as?",
          options: [
            "Object oriented language",
            "Functional language",
            "Structural language",
            "None of the above",
          ],
          createdAt: "2025-02-07T00:00:58.512Z",
          correctAnswer: "True",
          quizId: "67a54d3d0850c20a69ec4b47",
        },
      ],
    },
    {
      id: "67a550f7a444cf734f4ba0a5",
      title: "JavaScript Basics",
      userId: "67a3c2a2f6da6ad0d6555a0c",
      courseId: "67a47cbe9346459991ac9ff3",
      createdAt: "2025-02-07T00:16:50.617Z",
      questions: [
        {
          id: "67a550f7a444cf734f4ba0a6",
          text: "Is JavaScript dynamically typed?",
          options: ["True", "False"],
          createdAt: "2025-02-07T00:16:50.617Z",
          correctAnswer: "True",
          quizId: "67a550f7a444cf734f4ba0a5",
        },
        {
          id: "67a550f7a444cf734f4ba0a7",
          text: "Does JavaScript use curly braces?",
          options: ["True", "False"],
          createdAt: "2025-02-07T00:16:50.617Z",
          correctAnswer: "True",
          quizId: "67a550f7a444cf734f4ba0a5",
        },
        {
          id: "67a550f7a444cf734f4ba0a8",
          text: "What is javascript classified as?",
          options: [
            "Object oriented language",
            "Functional language",
            "Structural language",
            "None of the above",
          ],
          createdAt: "2025-02-07T00:16:50.617Z",
          correctAnswer: "True",
          quizId: "67a550f7a444cf734f4ba0a5",
        },
      ],
    },
    {
      id: "67a55493d056ffa5b7df52b2",
      title: "JavaScript Basics",
      userId: "67a3c2a2f6da6ad0d6555a0c",
      courseId: "67a47cbe9346459991ac9ff3",
      createdAt: "2025-02-07T00:32:18.829Z",
      questions: [
        {
          id: "67a55493d056ffa5b7df52b3",
          text: "Is JavaScript dynamically typed?",
          options: ["True", "False"],
          createdAt: "2025-02-07T00:32:18.829Z",
          correctAnswer: "True",
          quizId: "67a55493d056ffa5b7df52b2",
        },
        {
          id: "67a55493d056ffa5b7df52b4",
          text: "Does JavaScript use curly braces?",
          options: ["True", "False"],
          createdAt: "2025-02-07T00:32:18.829Z",
          correctAnswer: "True",
          quizId: "67a55493d056ffa5b7df52b2",
        },
        {
          id: "67a55493d056ffa5b7df52b5",
          text: "What is javascript classified as?",
          options: [
            "Object oriented language",
            "Functional language",
            "Structural language",
            "None of the above",
          ],
          createdAt: "2025-02-07T00:32:18.829Z",
          correctAnswer: "Object oriented language",
          quizId: "67a55493d056ffa5b7df52b2",
        },
      ],
    },
  ],
  success: true,
};

//JSON file to check quiz answer
const checkAnswer_body = {
  "userId": "67a3c2a2f6da6ad0d6555a0c",
  "answers": [
    {
      "questionId": "67a54d3d0850c20a69ec4b48",
      "answer": "True"
    },
    {
      "questionId": "67a54d3d0850c20a69ec4b49",
      "answer": "True"
    },
     {
      "questionId": "67a54d3d0850c20a69ec4b4a",
      "answer": "True"
    }
  ]
}

