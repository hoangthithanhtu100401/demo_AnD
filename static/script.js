async function convertCurrency() {
    const amount = document.getElementById('amount').value;
    const fromCurrency = document.getElementById('from-currency').value;
    const toCurrency = document.getElementById('to-currency').value;

    if (!amount || isNaN(amount)) {
        alert('Vui lòng nhập số tiền hợp lệ!');
        return;
    }

    try {
        const response = await fetch('/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                from_currency: fromCurrency,
                to_currency: toCurrency
            })
        });

        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }

        document.getElementById('result').value = data.result;
        document.getElementById('current-rate').textContent = 
            `1 ${fromCurrency} = ${data.rate} ${toCurrency}`;

        // Hiển thị bảng chuyển đổi nhanh
        const quickConversions = document.getElementById('quick-conversions');
        quickConversions.innerHTML = data.quick_conversions.map(conv => `
            <div class="quick-conversion-item">
                ${conv.amount} ${fromCurrency} = ${conv.result.toFixed(2)} ${toCurrency}
            </div>
        `).join('');

        document.getElementById('rate-info').style.display = 'block';
        
        // Cập nhật bảng tỷ giá với các loại tiền tệ khác
        updateAllRates(fromCurrency);

    } catch (error) {
        alert('Có lỗi xảy ra khi chuyển đổi tiền tệ!');
        console.error('Error:', error);
    }
}

async function updateAllRates(currency) {
    try {
        const response = await fetch('/get_all_rates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currency: currency
            })
        });

        const rates = await response.json();
        if (rates.error) {
            alert(rates.error);
            return;
        }

        const ratesGrid = document.getElementById('rates-grid');
        ratesGrid.innerHTML = Object.entries(rates)
            .filter(([code]) => code !== currency)
            .map(([code, rate]) => `
                <div class="rate-card">
                    <div class="rate-code">${code}</div>
                    <div class="rate-value">${rate}</div>
                    <div class="rate-text">1 ${currency} = ${rate} ${code}</div>
                </div>
            `).join('');

    } catch (error) {
        console.error('Error fetching all rates:', error);
    }
}

function swapCurrencies() {
    const fromCurrency = document.getElementById('from-currency');
    const toCurrency = document.getElementById('to-currency');
    const temp = fromCurrency.value;
    
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;
    
    // Nếu đã có kết quả, tự động chuyển đổi lại
    if (document.getElementById('result').value) {
        convertCurrency();
    }
}

// Tự động cập nhật tỷ giá khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    const fromCurrency = document.getElementById('from-currency').value;
    updateAllRates(fromCurrency);
});