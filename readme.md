API for using transaction NLP


#1: [Data Mining]Analyse Message for transaction data
'''
	You need <accessToken: each account has a unique token. Request support to be given one>
'''
method: [GET, POST],
baseURL: https://nlp.hudumabomba.com/token/<accessToken>/,
data:{
	message:<message: The message to be analysed>,
	phone:<phone: phone number which received it>,
},

#2: Check Account Details Including Your Token to login
baseURL=https://lipabomba.com/api/v1/account/token/<accessToken>/

	
#2: Check User Balance against your balance
baseURL=https://lipabomba.com/api/v1/account/token/<accessToken>/?action=balance&accountID=<accountID>
eg https://lipabomba.com/api/v1/account/token/<accessToken>/?action=balance&accountID=25575816121212



#3: Update Transactions
token is obtained from the account details on step #1 or from your dashboard
baseURL:https://lipabomba.com/api/v1/account/token/<accessToken>/
method:[GET, POST]

#3.1: CREATE Transaction
	        `
	        method:"POST",
	        headers: "Authorization: Token <token>"
	        data:{
		          detail: 'The memo to be added here',
		          confirmationCode: '93685440123',
		          transactionTime: 2020-09-18T08:26:00.000Z,
		          amount: 1500,
		          transactionFee: 50,
		          latestBalance: 120178,
		          isAmountIn: false,
		          currency: 'TZS',
		          accountFirst: {
		            name: '<phoneNumber>',
		            accountID: '<FULL NAME>',
		          },
		          accountSecond: {
		            accountID: '<phoneNumber>',
		            name: '<FULL NAME>',
		          },
		          user: 16,
	        },

	        reponse: CREATED TRANSACTION with more details or errors if not created
	        `




