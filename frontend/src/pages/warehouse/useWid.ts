import { useParams } from 'react-router-dom';

export const useWid = () => Number(useParams().wid);
