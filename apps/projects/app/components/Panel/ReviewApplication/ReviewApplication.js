import React, { useState } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { format as formatDate, formatDistance } from 'date-fns'
import {
  DropDown,
  GU,
  Text,
  TextInput,
  useTheme,
} from '@aragon/ui'
import { FormField, FieldTitle } from '../../Form'
import useGithubAuth from '../../../hooks/useGithubAuth'
import { useAragonApi } from '../../../api-react'
import { usePanelManagement } from '../../Panel'
import { ipfsAdd } from '../../../utils/ipfs-helpers'
import { toHex } from 'web3-utils'
import { issueShape } from '../../../utils/shapes.js'
import { DetailHyperText } from '../../../../../../shared/ui'
import {
  Avatar,
  FieldText,
  IssueTitle,
  ReviewButtons,
  Status,
  SubmissionDetails,
  UserLink,
} from '../PanelComponents'

const ReviewApplication = ({ issue, requestIndex, readOnly }) => {
  const githubCurrentUser = useGithubAuth()
  const {
    api: { reviewApplication },
  } = useAragonApi()
  const { closePanel } = usePanelManagement()
  const theme = useTheme()

  const [ feedback, setFeedback ] = useState('')
  const [ index, setIndex ] = useState(requestIndex)
  /*
  issue.requestsData = [{
    contributorAddr: "0xb4124cEB3451635DAcedd11767f004d8a28c6eE7", requestIPFSHash: "QmR9AjJ5Smhah5SnziqvZctosqpkCsTwbmPEgE1FydNXEe",
    workplan: "app1", hours: "1", eta: "2020-01-20T23:00:00.000Z", ack1: true, ack2: true,
    user: {
      id: "MDQ6VXNlcjM0NDUyMTMx", login: "rkzel", url: "https://github.com/rkzel", avatarUrl: "https://avatars0.githubusercontent.com/u/34452131?v=4", applicationDate: "2020-01-13T09:40:08.065Z",
    }
  }, {
    contributorAddr: "0xb4124cEB3451635DAcedd11767f004d8a28c6eE7", requestIPFSHash: "QmR9AjJ5Smhah5SnziqvZctosqpkCsTwbmPEgE1FydNXEe",
    workplan: "app2", hours: "2", eta: "2020-01-21T23:00:00.000Z", ack1: true, ack2: true,
    user: {
      id: "MDQ6VXNlcjM0NDUyMTMx", login: "rkzel2", url: "https://github.com/rkzel", avatarUrl: "https://avatars0.githubusercontent.com/u/34452131?v=4", applicationDate: "2020-01-13T09:40:08.065Z",
    }

  }, {
    contributorAddr: "0xb4124cEB3451635DAcedd11767f004d8a28c6eE7", requestIPFSHash: "QmR9AjJ5Smhah5SnziqvZctosqpkCsTwbmPEgE1FydNXEe",
    workplan: "app3", hours: "3", eta: "2020-01-21T23:00:00.000Z", ack1: true, ack2: true,
    user: {
      id: "MDQ6VXNlcjM0NDUyMTMx", login: "rkzel3", url: "https://github.com/rkzel", avatarUrl: "https://avatars0.githubusercontent.com/u/34452131?v=4", applicationDate: "2020-01-13T09:40:08.065Z",
    },
    review: {
      approved: true,
      reviewDate: '2020-01-21T23:00:00.000Z',
      feedback: 'haha'
    },
  }
  ]
*/

  // are both types present?
  const types = issue.requestsData.reduce((types, request) => {
    types['review' in request ? 1 : 0] = true
    return types
  }, [ false, false ] )

  const typesToShow = []
  if (types[0]) typesToShow.push('Available for review')
  if (types[1]) typesToShow.push('Reviewed')

  // of what type is the request asked for - default 'Available for review'
  let indexTypeSelected = 0
  // unless requested was 'reviewed' and there are no unreviewed reqs
  if ('review' in issue.requestsData[requestIndex])
    indexTypeSelected = (typesToShow[0] === 'Reviewed') ? 0 : 1

  const [ indexType, setIndexType ] = useState(indexTypeSelected)

  // filter requests
  const requests = issue.requestsData.filter(r => {
    return (typesToShow[indexType] === 'Reviewed') ? 'review' in r : !('review' in r)
  })

  const updateFeedback = e => setFeedback(e.target.value)
  const buildReturnData = approved => {
    const today = new Date()
    return {
      feedback,
      approved,
      user: githubCurrentUser,
      reviewDate: today.toISOString(),
    }
  }

  const onAccept = () => onReviewApplication(true)
  const onReject = () => onReviewApplication(false)
  const changeRequest = (index) => setIndex(index)
  const changeRequestType = (index) => {
    setIndex(0)
    setIndexType(index)
  }

  const onReviewApplication = async (approved) => {
    closePanel()
    const review = buildReturnData(approved)
    // new IPFS data is old data plus state returned from the panel
    const ipfsData = requests[index]
    const requestIPFSHash = await ipfsAdd({ ...ipfsData, review })
    reviewApplication(
      toHex(issue.repoId),
      issue.number,
      requests[index].contributorAddr,
      requestIPFSHash,
      approved
    ).toPromise()
  }

  const request = requests[index]
  const application = {
    user: {
      login: request.user.login,
      name: request.user.name,
      avatarUrl: request.user.avatarUrl,
      url: request.user.url
    },
    workplan: request.workplan,
    hours: request.hours,
    eta: (request.eta === '-') ? request.eta : formatDate(new Date(request.eta), 'MMM d'),
    applicationDate: request.applicationDate
  }

  const applicant = application.user
  const applicantName = applicant.name ? applicant.name : applicant.login
  const applicationDateDistance = formatDistance(new Date(application.applicationDate), new Date())

  return (
    <div css={`margin: ${2 * GU}px 0`}>
      <IssueTitle issue={issue} />

      <div css={`display: flex; margin-bottom: ${3 * GU}px`}>
        <DropDown
          name="Type"
          items={typesToShow}
          onChange={changeRequestType}
          selected={indexType}
          wide
          css={`margin-right: ${0.5 * GU}px`}
        />

        <DropDown
          name="Applicant"
          items={requests.map(request => request.user.login)}
          onChange={changeRequest}
          selected={index}
          wide
          css={`margin-left: ${0.5 * GU}px`}
        />
      </div>

      <SubmissionDetails background={`${theme.background}`} border={`${theme.border}`}>
        <UserLink>
          <Avatar user={applicant} />
          {applicantName} applied {applicationDateDistance} ago
        </UserLink>

        <FieldTitle>Work Plan</FieldTitle>
        <DetailHyperText>{application.workplan}</DetailHyperText>

        <Estimations>
          <div>
            <FieldTitle>Estimated Hours</FieldTitle>
            <Text>{application.hours}</Text>
          </div>
          <div>
            <FieldTitle>Estimated Date</FieldTitle>
            <Text>{application.eta}</Text>
          </div>
        </Estimations>
      </SubmissionDetails>

      {('review' in request) && (
        <React.Fragment>
          <FieldTitle>Application Status</FieldTitle>

          <FieldText>
            <Status reviewDate={request.review.reviewDate} approved={request.review.approved} />
          </FieldText>

          <FieldTitle>Feedback</FieldTitle>
          <Text.Block style={{ margin: '10px 0' }}>
            {request.review.feedback.length ? request.review.feedback : 'No feedback was provided'}
          </Text.Block>
        </React.Fragment>
      )}
      {!readOnly && !request.review && (
        <React.Fragment>
          <FormField
            label="Feedback"
            input={
              <TextInput.Multiline
                name='feedback'
                rows="3"
                onChange={updateFeedback}
                placeholder="Do you have any feedback to provide the applicant?"
                value={feedback}
                wide
                aria-label="Feedback"
              />
            }
          />

          <ReviewButtons onAccept={onAccept} onReject={onReject} disabled={false} />

        </React.Fragment>
      )}

    </div>
  )
}
ReviewApplication.propTypes = {
  issue: issueShape,
  requestIndex: PropTypes.number.isRequired,
  readOnly: PropTypes.bool.isRequired,
}

const Estimations = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto;
  grid-gap: 12px;
`

export default ReviewApplication
