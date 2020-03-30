import { formatRelative } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'
import matchSorter from 'match-sorter'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Icon, Results } from '../components'
import { Spinner } from '../components/Spinner'
import { useFollowingCountriesContext } from '../contexts/follow'
import { Searchbox } from '../layout/Searchbox'
import { useSummary } from '../server/summary'
import { getCountryId } from '../utils/getCountryId'
import { useInput } from '../utils/useInput'

const LOCALES = { fr, en: enUS }

export default function Home() {
  const { value: search, onChange: setSearch } = useInput('')
  const { data, status } = useSummary()
  const { t, i18n } = useTranslation()
  const [language] = i18n.language.split('-')
  const { countries } = useFollowingCountriesContext()

  const statusResult = {
    loading: () => <Spinner className="Home__loader" />,
    error: () => 'there was an error... sorry',
    success: data => {
      const { followingCountries, otherCountries, global } = getSeparatedData(
        data,
        countries,
        {
          global: { Country: t('worldwide'), Slug: 'worldwide' },
        },
      )

      const sortedList = matchSorter(otherCountries, search.trim(''), {
        keys: ['Country', 'Slug'],
      })

      return (
        <>
          <h4 className="Home__update">
            {t('update')} :{' '}
            {formatRelative(new Date(data.Date), new Date(), {
              locale: LOCALES[language],
            })}{' '}
            (source :{' '}
            <a
              href="https://covid19api.com/"
              rel="noopener noreferrer"
              target="_blank"
            >
              covid19api
            </a>
            )
          </h4>

          <Results data={[global]} global />

          {!!followingCountries?.length && (
            <>
              <h3 className="Home__subtitle">{t('starred')}</h3>
              <Results data={followingCountries} />
              <h3 className="Home__subtitle">{t('other')}</h3>
            </>
          )}

          <Searchbox value={search} onChange={setSearch} />

          {!!sortedList.length ? (
            <Results data={sortedList} />
          ) : (
            <span className="Home__empty">{t('empty')}</span>
          )}
        </>
      )
    },
  }

  return (
    <main className="Home">
      <h1 className="Home__title">
        <Icon name="virus-solid" />
        {t('title')}
      </h1>

      {statusResult[status](data)}
    </main>
  )
}

function getSeparatedData(data, countries, initialAcc) {
  return data.Countries.reduce((acc, curr) => {
    if (!curr.Country) return acc

    let newAcc

    if (countries.includes(getCountryId(curr))) {
      newAcc = {
        ...acc,
        followingCountries: [...(acc?.followingCountries || []), curr],
      }
    } else
      newAcc = {
        ...acc,
        otherCountries: [...(acc?.otherCountries || []), curr],
      }

    return {
      ...newAcc,
      global: {
        ...acc.global,
        TotalConfirmed: addToAccSum(acc, curr, 'TotalConfirmed'),
        NewConfirmed: addToAccSum(acc, curr, 'NewConfirmed'),
        TotalRecovered: addToAccSum(acc, curr, 'TotalRecovered'),
        NewRecovered: addToAccSum(acc, curr, 'NewRecovered'),
        TotalDeaths: addToAccSum(acc, curr, 'TotalDeaths'),
        NewDeaths: addToAccSum(acc, curr, 'NewDeaths'),
      },
    }
  }, initialAcc)
}

function addToAccSum(acc, curr, key) {
  return curr[key] > 0 ? (acc.global[key] || 0) + curr[key] : acc.global[key]
}
