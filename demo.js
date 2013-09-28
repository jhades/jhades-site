
var summr = require('summr');

var Account = summr.entity('Account', 'TBL_ACCOUNT', {
	acctNumber : {
		dbCol: 'ACCT_NBR' ,
		type: String},
	balance: {
		dbCol: 'BAL',
		type: Number
	}
});


summr.transaction('transferFunds', 'REQUIRED', function(fromAcct, toAcct, amount) {
	
	if (fromAcct.balance - amount > 0) {
		fromAcct.balance -= amount;
		toAcct.balance += amount;
	} else {
		throw new InsufficientBalanceException('Acccount ' + fromAcct.acctNumber + ' balance is insuficient.');
	}

});


(function() {

	var fromAcct = summr.findBy(Account,'acctId','77712345-05');
	var toAcct = summr.findBy(Account,'acctId','9876543321-02');

	summr.transferFunds(fromAcct, toAcct, 10);

}());
