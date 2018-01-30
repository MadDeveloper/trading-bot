export function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split('.')[1] || '').length
    const stepDecCount = (step.toString().split('.')[1] || '').length
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount
    const valInt = parseInt(val.toFixed(decCount).replace('.', ''))
    const stepInt = parseInt(step.toFixed(decCount).replace('.', ''))

    return (valInt % stepInt) / Math.pow(10, decCount)
}

export function truncateLongDigits(number: number, digits: number = 8): number {
    const quantityString = number.toString()
    let normalizedQuantity = number

    if (quantityString.includes('.')) {
        let [integers, decimals] = quantityString.split('.')
        let power = '0'

        if (decimals.includes('e')) {
            const decimalsWithPower = decimals.split('e')

            decimals = decimalsWithPower[0]
            power = decimalsWithPower[1]
        }

        normalizedQuantity = Number(`${integers}.${decimals.substring(0, digits)}e${power}`)
    }

    return normalizedQuantity
}