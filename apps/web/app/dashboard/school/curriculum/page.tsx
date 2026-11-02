import CurriculumClient from './CurriculumClient'
import RequirePermission from '../../../../components/RequirePermission'
export default function CurriculumPage() { return <RequirePermission permission="school.classes.view"><CurriculumClient /></RequirePermission> }
