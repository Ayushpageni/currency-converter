        // Exchange rate cache to avoid excessive API calls
        const rateCache = {};
        const CACHE_DURATION = 60000; // 1 minute

        // Get elements
        const fromAmount = document.getElementById('fromAmount');
        const fromCurrency = document.getElementById('fromCurrency');
        const toAmount = document.getElementById('toAmount');
        const toCurrency = document.getElementById('toCurrency');
        const result = document.getElementById('result');
        const rateInfo = document.getElementById('rateInfo');

        // Event listeners
        fromAmount.addEventListener('input', convertCurrency);
        fromCurrency.addEventListener('change', convertCurrency);
        toCurrency.addEventListener('change', convertCurrency);

        // Fetch exchange rates from a free API
        async function getExchangeRate(fromCur, toCur) {
            const cacheKey = `${fromCur}_${toCur}`;
            const now = Date.now();
            
            // Check cache first
            if (rateCache[cacheKey] && (now - rateCache[cacheKey].timestamp < CACHE_DURATION)) {
                return rateCache[cacheKey].rate;
            }

            try {
                // Using exchangerate-api.com (free tier allows 1500 requests/month)
                const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCur}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.rates && data.rates[toCur]) {
                    const rate = data.rates[toCur];
                    
                    // Cache the result
                    rateCache[cacheKey] = {
                        rate: rate,
                        timestamp: now
                    };
                    
                    return rate;
                } else {
                    throw new Error('Currency not found in response');
                }
            } catch (error) {
                console.error('Error fetching exchange rate:', error);
                
                // Fallback to backup API
                try {
                    const response = await fetch(`https://api.fixer.io/latest?base=${fromCur}&symbols=${toCur}`);
                    const data = await response.json();
                    
                    if (data.rates && data.rates[toCur]) {
                        const rate = data.rates[toCur];
                        rateCache[cacheKey] = { rate, timestamp: now };
                        return rate;
                    }
                } catch (fallbackError) {
                    console.error('Fallback API also failed:', fallbackError);
                }
                
                throw new Error('Unable to fetch exchange rate');
            }
        }

        // Convert currency
        async function convertCurrency() {
            const amount = parseFloat(fromAmount.value);
            const fromCur = fromCurrency.value;
            const toCur = toCurrency.value;

            if (!amount || amount <= 0) {
                result.textContent = 'Enter a valid amount';
                result.className = 'result-text';
                toAmount.value = '';
                rateInfo.textContent = 'Select currencies to see exchange rate';
                return;
            }

            if (fromCur === toCur) {
                const convertedAmount = amount;
                toAmount.value = convertedAmount.toFixed(2);
                result.textContent = `${amount} ${fromCur} = ${convertedAmount.toFixed(2)} ${toCur}`;
                result.className = 'result-text';
                rateInfo.textContent = '1 ' + fromCur + ' = 1.0000 ' + toCur;
                return;
            }

            // Show loading state
            result.textContent = 'Converting...';
            result.className = 'result-text loading';
            rateInfo.textContent = 'Fetching latest rates...';

            try {
                const rate = await getExchangeRate(fromCur, toCur);
                const convertedAmount = amount * rate;
                
                toAmount.value = convertedAmount.toFixed(2);
                result.textContent = `${amount} ${fromCur} = ${convertedAmount.toFixed(2)} ${toCur}`;
                result.className = 'result-text';
                rateInfo.textContent = `1 ${fromCur} = ${rate.toFixed(4)} ${toCur} • Updated: ${new Date().toLocaleTimeString()}`;
                
            } catch (error) {
                result.textContent = 'Error: Unable to get exchange rate. Please try again.';
                result.className = 'result-text error';
                rateInfo.textContent = 'Please check your internet connection and try again';
                toAmount.value = '';
            }
        }

        // Swap currencies
        function swapCurrencies() {
            const tempCurrency = fromCurrency.value;
            fromCurrency.value = toCurrency.value;
            toCurrency.value = tempCurrency;
            
            // Also swap amounts if there's a converted amount
            if (toAmount.value) {
                const tempAmount = fromAmount.value;
                fromAmount.value = toAmount.value;
                convertCurrency();
            }
        }

        // Quick conversion buttons
        function setQuickConversion(from, to) {
            fromCurrency.value = from;
            toCurrency.value = to;
            if (fromAmount.value) {
                convertCurrency();
            }
        }

        // Initialize with default conversion
        window.addEventListener('load', function() {
            if (fromAmount.value) {
                convertCurrency();
            }
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && (e.target === fromAmount || e.target === fromCurrency || e.target === toCurrency)) {
                convertCurrency();
            }
            if (e.key === 'Tab' && e.shiftKey && e.target === fromAmount) {
                e.preventDefault();
                swapCurrencies();
            }
        });